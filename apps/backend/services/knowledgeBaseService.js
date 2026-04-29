import { prisma } from '../lib/prisma.js';
import { RAG_CONFIG } from '../config/ai.js';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

const DEFAULT_EMBEDDING_MODEL = RAG_CONFIG.embeddingModel || 'text-embedding-3-small';
const DEFAULT_CHUNK_SIZE = RAG_CONFIG.chunkSize || 1200;
const DEFAULT_CHUNK_OVERLAP = RAG_CONFIG.chunkOverlap || 180;
const DEFAULT_MAX_CHUNKS_PER_FILE = RAG_CONFIG.maxChunksPerFile || 120;
const DEFAULT_TOP_K = RAG_CONFIG.topK || 5;
const DEFAULT_MAX_CONTEXT_LENGTH = RAG_CONFIG.maxContextLength || 5000;
const DEFAULT_SIMILARITY_THRESHOLD = RAG_CONFIG.similarityThreshold ?? 0.35;

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function normalizeWhitespace(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
}

function uniqueWords(text = '') {
  return [...new Set(
    String(text)
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .map((word) => word.trim())
      .filter((word) => word.length > 2)
  )];
}

function isVector(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'number');
}

export class KnowledgeBaseService {
  getEmbeddingModel() {
    return process.env.RAG_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  }

  getChunkSize() {
    return toPositiveInt(process.env.RAG_CHUNK_SIZE, DEFAULT_CHUNK_SIZE);
  }

  getChunkOverlap() {
    const chunkSize = this.getChunkSize();
    return Math.min(toPositiveInt(process.env.RAG_CHUNK_OVERLAP, DEFAULT_CHUNK_OVERLAP), chunkSize - 1);
  }

  getMaxChunksPerFile() {
    return toPositiveInt(process.env.RAG_MAX_CHUNKS_PER_FILE, DEFAULT_MAX_CHUNKS_PER_FILE);
  }

  getSimilarityThreshold() {
    const parsed = Number(process.env.RAG_SIMILARITY_THRESHOLD);
    return Number.isFinite(parsed) ? parsed : DEFAULT_SIMILARITY_THRESHOLD;
  }

  canUseEmbeddings() {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  /**
   * Загрузка, парсинг, чанкинг и индексация файла.
   */
  async uploadFile(userId, file) {
    const content = await this.parseFile(file);
    const chunks = this.chunkText(content);
    const embeddings = await this.tryGenerateChunkEmbeddings(chunks);
    const embeddingStatus = this.getEmbeddingStatus(chunks, embeddings);
    const chunkCreates = chunks.map((chunk, index) => ({
      chunkIndex: index,
      content: chunk.content,
      embedding: embeddings[index] || null,
      tokenEstimate: chunk.tokenEstimate,
      charStart: chunk.charStart,
      charEnd: chunk.charEnd
    }));

    return await prisma.knowledgeBase.create({
      data: {
        userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        content,
        embeddings: this.buildEmbeddingMetadata(chunks.length, embeddingStatus.embeddedCount, embeddingStatus.status),
        ...(chunkCreates.length > 0 ? { chunks: { create: chunkCreates } } : {})
      },
      include: {
        _count: { select: { chunks: true } },
        chunks: { select: { embedding: true }, take: 1 }
      }
    });
  }

  async parseFile(file) {
    if (file.mimetype === 'application/pdf') {
      return await this.parsePDF(file.buffer);
    }

    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await this.parseDOCX(file.buffer);
    }

    if (file.mimetype === 'text/plain') {
      return file.buffer.toString('utf-8');
    }

    throw new Error(`Unsupported file type: ${file.mimetype}`);
  }

  /**
   * Получение списка файлов пользователя.
   */
  async getFiles(userId) {
    const files = await prisma.knowledgeBase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { chunks: true } },
        chunks: { select: { embedding: true }, take: 1 }
      }
    });

    return files.map((file) => this.toFileDto(file));
  }

  /**
   * Удаление файла и его чанков.
   */
  async deleteFile(userId, fileId) {
    return await prisma.knowledgeBase.deleteMany({
      where: { id: fileId, userId }
    });
  }

  /**
   * Переиндексация конкретного файла. Полезно для старых файлов без чанков.
   */
  async reindexFile(userId, fileId) {
    const file = await prisma.knowledgeBase.findFirst({
      where: { id: fileId, userId }
    });

    if (!file) {
      throw new Error('Knowledge base file not found');
    }

    await this.indexFileChunks(file, { force: true });

    const updated = await prisma.knowledgeBase.findUnique({
      where: { id: fileId },
      include: {
        _count: { select: { chunks: true } },
        chunks: { select: { embedding: true }, take: 1 }
      }
    });

    return this.toFileDto(updated);
  }

  /**
   * Поиск релевантных фрагментов (RAG).
   */
  async search(userId, query, topK = DEFAULT_TOP_K, options = {}) {
    const normalizedQuery = normalizeWhitespace(query);
    if (!normalizedQuery) {
      return [];
    }

    const limit = Math.min(toPositiveInt(topK, DEFAULT_TOP_K), options.maxTopK || 10);

    await this.ensureChunksForUser(userId);

    const chunks = await prisma.knowledgeBaseChunk.findMany({
      where: {
        knowledgeBase: { userId }
      },
      include: {
        knowledgeBase: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            createdAt: true
          }
        }
      }
    });

    if (chunks.length === 0) {
      return [];
    }

    const vectorChunks = chunks.filter((chunk) => isVector(chunk.embedding));
    if (this.canUseEmbeddings() && vectorChunks.length > 0) {
      try {
        const [queryEmbedding] = await this.generateEmbeddingsBatch([normalizedQuery]);
        if (isVector(queryEmbedding)) {
          return this.vectorSearch(vectorChunks, queryEmbedding, normalizedQuery, limit, options);
        }
      } catch (error) {
        console.error('Vector search failed, falling back to keyword search:', error.message);
      }
    }

    return this.keywordSearch(chunks, normalizedQuery, limit);
  }

  vectorSearch(chunks, queryEmbedding, query, topK, options = {}) {
    const threshold = options.minSimilarity ?? this.getSimilarityThreshold();
    const ranked = chunks
      .map((chunk) => this.toSearchResult(chunk, this.cosineSimilarity(queryEmbedding, chunk.embedding), query, 'vector'))
      .filter((result) => result.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity);

    const confident = ranked.filter((result) => result.similarity >= threshold);
    const selected = confident.length > 0 ? confident : ranked;

    return selected.slice(0, topK).map((result) => ({
      ...result,
      matchType: confident.length > 0 ? 'vector' : 'vector-low-confidence'
    }));
  }

  /**
   * Поиск по ключевым словам (fallback).
   */
  keywordSearch(chunks, query, topK) {
    const queryWords = uniqueWords(query);
    if (queryWords.length === 0) {
      return [];
    }

    return chunks
      .map((chunk) => {
        const contentLower = chunk.content.toLowerCase();
        const matches = queryWords.filter((word) => contentLower.includes(word));
        const phraseBoost = contentLower.includes(query.toLowerCase()) ? 0.25 : 0;
        const score = matches.length / queryWords.length + phraseBoost;
        return { chunk, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ chunk, score }) => this.toSearchResult(chunk, Math.min(score, 1), query, 'keyword'));
  }

  async ensureChunksForUser(userId) {
    const files = await prisma.knowledgeBase.findMany({
      where: { userId },
      include: {
        _count: { select: { chunks: true } }
      }
    });

    for (const file of files) {
      if (file._count.chunks === 0) {
        await this.indexFileChunks(file);
      }
    }
  }

  async indexFileChunks(file, { force = false } = {}) {
    if (!force) {
      const existingCount = await prisma.knowledgeBaseChunk.count({
        where: { knowledgeBaseId: file.id }
      });

      if (existingCount > 0) {
        return existingCount;
      }
    }

    const chunks = this.chunkText(file.content || '');
    const embeddings = await this.tryGenerateChunkEmbeddings(chunks);
    const embeddingStatus = this.getEmbeddingStatus(chunks, embeddings);

    await prisma.$transaction(async (tx) => {
      await tx.knowledgeBaseChunk.deleteMany({
        where: { knowledgeBaseId: file.id }
      });

      if (chunks.length > 0) {
        await tx.knowledgeBaseChunk.createMany({
          data: chunks.map((chunk, index) => ({
            knowledgeBaseId: file.id,
            chunkIndex: index,
            content: chunk.content,
            embedding: embeddings[index] || null,
            tokenEstimate: chunk.tokenEstimate,
            charStart: chunk.charStart,
            charEnd: chunk.charEnd
          }))
        });
      }

      await tx.knowledgeBase.update({
        where: { id: file.id },
        data: {
          embeddings: this.buildEmbeddingMetadata(chunks.length, embeddingStatus.embeddedCount, embeddingStatus.status)
        }
      });
    });

    return chunks.length;
  }

  chunkText(content) {
    const text = String(content || '').replace(/\r\n/g, '\n').trim();
    if (!text) {
      return [];
    }

    const chunkSize = this.getChunkSize();
    const overlap = this.getChunkOverlap();
    const maxChunks = this.getMaxChunksPerFile();
    const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
    const chunks = [];

    let current = '';
    let currentStart = 0;
    let cursor = 0;

    const pushChunk = (rawContent, start, end) => {
      const normalized = normalizeWhitespace(rawContent);
      if (!normalized) return;

      chunks.push({
        content: normalized,
        tokenEstimate: this.estimateTokens(normalized),
        charStart: Math.max(0, start),
        charEnd: Math.max(start, end)
      });
    };

    for (const paragraph of paragraphs) {
      const paragraphStart = text.indexOf(paragraph, cursor);
      const safeStart = paragraphStart === -1 ? cursor : paragraphStart;
      const safeEnd = safeStart + paragraph.length;

      if (!current) {
        current = paragraph;
        currentStart = safeStart;
      } else if ((current.length + paragraph.length + 2) <= chunkSize) {
        current += `\n\n${paragraph}`;
      } else {
        pushChunk(current, currentStart, safeStart);
        const overlapText = current.slice(Math.max(0, current.length - overlap));
        current = overlapText ? `${overlapText}\n\n${paragraph}` : paragraph;
        currentStart = Math.max(0, safeStart - overlapText.length);
      }

      cursor = safeEnd;

      while (current.length > chunkSize * 1.4) {
        const slice = current.slice(0, chunkSize);
        pushChunk(slice, currentStart, currentStart + slice.length);
        const tailStart = Math.max(0, chunkSize - overlap);
        current = current.slice(tailStart);
        currentStart += tailStart;
      }

      if (chunks.length >= maxChunks) {
        break;
      }
    }

    if (current && chunks.length < maxChunks) {
      pushChunk(current, currentStart, text.length);
    }

    return chunks.slice(0, maxChunks);
  }

  estimateTokens(text) {
    return Math.ceil(String(text || '').length / 4);
  }

  async tryGenerateChunkEmbeddings(chunks) {
    if (!this.canUseEmbeddings() || chunks.length === 0) {
      return [];
    }

    try {
      return await this.generateEmbeddingsBatch(chunks.map((chunk) => chunk.content));
    } catch (error) {
      console.error('Failed to generate embeddings:', error.message);
      return [];
    }
  }

  async generateEmbedding(text) {
    const [embedding] = await this.generateEmbeddingsBatch([text]);
    return embedding;
  }

  /**
   * Генерация embeddings через OpenAI batch API.
   */
  async generateEmbeddingsBatch(texts) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const inputs = texts
      .map((text) => normalizeWhitespace(text).slice(0, 24000))
      .filter(Boolean);

    if (inputs.length === 0) {
      return [];
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.getEmbeddingModel(),
        input: inputs
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OpenAI embeddings API error: ${response.status} ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    return (data.data || [])
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  }

  /**
   * Косинусное сходство.
   */
  cosineSimilarity(vecA, vecB) {
    if (!isVector(vecA) || !isVector(vecB) || vecA.length !== vecB.length) {
      return 0;
    }

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Извлечение релевантного фрагмента.
   */
  extractRelevantSnippet(content, query, maxLength = 700) {
    const normalizedContent = normalizeWhitespace(content);
    if (normalizedContent.length <= maxLength) {
      return normalizedContent;
    }

    const contentLower = normalizedContent.toLowerCase();
    const queryWords = uniqueWords(query);

    let bestIndex = -1;
    for (const word of queryWords) {
      const index = contentLower.indexOf(word);
      if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
        bestIndex = index;
      }
    }

    if (bestIndex === -1) {
      return `${normalizedContent.slice(0, maxLength)}...`;
    }

    const start = Math.max(0, bestIndex - 140);
    const end = Math.min(normalizedContent.length, start + maxLength);
    return `${start > 0 ? '...' : ''}${normalizedContent.slice(start, end)}${end < normalizedContent.length ? '...' : ''}`;
  }

  /**
   * Получение RAG-контекста для генерации.
   */
  async getGenerationContext(userId, query, options = {}) {
    const topK = options.topK || DEFAULT_TOP_K;
    const maxContextLength = options.maxContextLength || DEFAULT_MAX_CONTEXT_LENGTH;
    const results = await this.search(userId, query, topK, options);

    if (results.length === 0) {
      return {
        query,
        context: '',
        sources: [],
        used: false,
        embeddingModel: this.getEmbeddingModel()
      };
    }

    const parts = [];
    let usedLength = 0;

    for (const [index, item] of results.entries()) {
      const sourceText = item.content || item.snippet;
      const sourceBlock = [
        `### SOURCE ${index + 1}`,
        `File: ${item.file.fileName}`,
        `Chunk: ${item.chunkIndex + 1}`,
        `Match: ${item.matchType}, score ${item.similarity}`,
        sourceText
      ].join('\n');

      if (usedLength + sourceBlock.length > maxContextLength && parts.length > 0) {
        break;
      }

      const remaining = Math.max(0, maxContextLength - usedLength);
      parts.push(sourceBlock.slice(0, remaining));
      usedLength += sourceBlock.length;

      if (usedLength >= maxContextLength) {
        break;
      }
    }

    return {
      query,
      context: parts.join('\n\n'),
      sources: results.map(({ content, ...source }) => source),
      used: parts.length > 0,
      embeddingModel: this.getEmbeddingModel()
    };
  }

  /**
   * Backward-compatible helper: возвращает только текст контекста.
   */
  async getContextForGeneration(userId, topic, topK = DEFAULT_TOP_K) {
    const result = await this.getGenerationContext(userId, topic, { topK });
    return result.context || null;
  }

  toSearchResult(chunk, similarity, query, matchType) {
    const roundedSimilarity = Number(Math.max(0, similarity).toFixed(4));

    return {
      chunkId: chunk.id,
      chunkIndex: chunk.chunkIndex,
      file: {
        id: chunk.knowledgeBase.id,
        fileName: chunk.knowledgeBase.fileName,
        fileType: chunk.knowledgeBase.fileType
      },
      similarity: roundedSimilarity,
      matchType,
      snippet: this.extractRelevantSnippet(chunk.content, query),
      content: chunk.content
    };
  }

  toFileDto(file) {
    const embeddedChunkCount = Number(file?.embeddings?.embeddedChunkCount || 0);
    const chunkCount = file?._count?.chunks || 0;

    return {
      id: file.id,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      createdAt: file.createdAt,
      chunkCount,
      hasEmbeddings: embeddedChunkCount > 0 || Boolean(file.chunks?.some((chunk) => isVector(chunk.embedding))),
      embeddingModel: file.embeddings?.model || null,
      embeddingStatus: file.embeddings?.status || (chunkCount > 0 ? 'keyword-only' : 'not-indexed')
    };
  }

  getEmbeddingStatus(chunks, embeddings) {
    const embeddedCount = embeddings.filter((embedding) => isVector(embedding)).length;

    return {
      embeddedCount,
      status: embeddedCount === chunks.length && chunks.length > 0
        ? 'ready'
        : embeddedCount > 0
          ? 'partial'
          : 'keyword-only'
    };
  }

  buildEmbeddingMetadata(chunkCount, embeddedChunkCount, status) {
    return {
      model: this.getEmbeddingModel(),
      chunkCount,
      embeddedChunkCount,
      status,
      indexedAt: new Date().toISOString()
    };
  }

  /**
   * Парсинг PDF.
   */
  async parsePDF(buffer) {
    const data = await pdf(buffer);
    return data.text;
  }

  /**
   * Парсинг DOCX.
   */
  async parseDOCX(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
