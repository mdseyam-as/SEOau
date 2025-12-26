import { prisma } from '../lib/prisma.js';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export class KnowledgeBaseService {
  /**
   * Загрузка и парсинг файла
   */
  async uploadFile(userId, file) {
    let content;

    if (file.mimetype === 'application/pdf') {
      content = await this.parsePDF(file.buffer);
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      content = await this.parseDOCX(file.buffer);
    } else if (file.mimetype === 'text/plain') {
      content = file.buffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    // Опциональная векторизация (если есть OPENAI_API_KEY)
    let embeddings = null;
    if (process.env.OPENAI_API_KEY && content.length > 0) {
      try {
        embeddings = await this.generateEmbeddings(content);
      } catch (error) {
        console.error('Failed to generate embeddings:', error.message);
      }
    }

    return await prisma.knowledgeBase.create({
      data: {
        userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        content,
        embeddings
      }
    });
  }

  /**
   * Получение списка файлов пользователя
   */
  async getFiles(userId) {
    return await prisma.knowledgeBase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        createdAt: true
      }
    });
  }

  /**
   * Удаление файла
   */
  async deleteFile(userId, fileId) {
    return await prisma.knowledgeBase.deleteMany({
      where: { id: fileId, userId }
    });
  }

  /**
   * Поиск релевантных фрагментов (RAG)
   */
  async search(userId, query, topK = 3) {
    const files = await prisma.knowledgeBase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (files.length === 0) {
      return [];
    }

    // Если есть embeddings - используем векторный поиск
    if (process.env.OPENAI_API_KEY) {
      try {
        const queryEmbedding = await this.generateEmbeddings(query);

        const results = [];
        for (const file of files) {
          if (!file.embeddings) continue;

          const similarity = this.cosineSimilarity(queryEmbedding, file.embeddings);
          results.push({
            file: {
              id: file.id,
              fileName: file.fileName
            },
            similarity,
            snippet: this.extractRelevantSnippet(file.content, query)
          });
        }

        return results
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, topK);
      } catch (error) {
        console.error('Vector search failed, falling back to keyword search:', error.message);
      }
    }

    // Fallback: простой поиск по ключевым словам
    return this.keywordSearch(files, query, topK);
  }

  /**
   * Поиск по ключевым словам (fallback)
   */
  keywordSearch(files, query, topK) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const results = [];

    for (const file of files) {
      const contentLower = file.content.toLowerCase();
      let matchCount = 0;

      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        results.push({
          file: {
            id: file.id,
            fileName: file.fileName
          },
          similarity: matchCount / queryWords.length,
          snippet: this.extractRelevantSnippet(file.content, query)
        });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Парсинг PDF
   */
  async parsePDF(buffer) {
    const data = await pdf(buffer);
    return data.text;
  }

  /**
   * Парсинг DOCX
   */
  async parseDOCX(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  /**
   * Генерация embeddings через OpenAI
   */
  async generateEmbeddings(text) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8191) // лимит токенов
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Косинусное сходство
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Извлечение релевантного фрагмента
   */
  extractRelevantSnippet(content, query, maxLength = 500) {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    // Ищем первое вхождение любого слова из запроса
    let bestIndex = -1;
    for (const word of queryWords) {
      const index = contentLower.indexOf(word);
      if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
        bestIndex = index;
      }
    }

    if (bestIndex === -1) {
      // Если ничего не найдено - возвращаем начало текста
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    // Расширяем контекст вокруг найденного места
    const start = Math.max(0, bestIndex - 100);
    const end = Math.min(content.length, bestIndex + maxLength - 100);

    let snippet = content.substring(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * Получение контекста для генерации
   */
  async getContextForGeneration(userId, topic, topK = 3) {
    const results = await this.search(userId, topic, topK);

    if (results.length === 0) {
      return null;
    }

    const contextParts = results.map((item, i) => `
### КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ [Источник ${i + 1}]
Файл: ${item.file.fileName}
${item.snippet}
`);

    return contextParts.join('\n');
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
