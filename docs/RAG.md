# Knowledge Base RAG

SEOau uses a chunk-level RAG pipeline for private user documents uploaded to Knowledge Base.

## Flow
1. User uploads a PDF, DOCX, or TXT file through `/api/knowledge-base/upload`.
2. Backend extracts plain text and splits it into overlapping chunks.
3. If `OPENAI_API_KEY` is configured, each chunk is embedded with `text-embedding-3-small` by default.
4. Chunks are stored in `KnowledgeBaseChunk`; the parent `KnowledgeBase.embeddings` field keeps indexing metadata for compatibility.
5. During `/api/generate`, the backend retrieves the most relevant chunks for the topic, keywords, region, and website context.
6. Retrieved excerpts are injected into the generation prompt as private source-of-truth context.
7. The response includes `knowledgeBaseSources` and `_rag` metadata so UI/history can show which sources were used.

## Fallbacks
- If `OPENAI_API_KEY` is missing, upload still works and chunks are stored without vectors.
- Search falls back to keyword matching.
- Existing files without chunks are auto-indexed on first search/generation, or manually via `POST /api/knowledge-base/:id/reindex`.

## Environment
```env
OPENAI_API_KEY=your_openai_api_key
RAG_EMBEDDING_MODEL=text-embedding-3-small
RAG_CHUNK_SIZE=1200
RAG_CHUNK_OVERLAP=180
RAG_MAX_CHUNKS_PER_FILE=120
RAG_SIMILARITY_THRESHOLD=0.35
```

## Database
- Prisma schema and migrations live in `packages/db/prisma`.
- Apply migrations with `npm run db:migrate` in development or `npm run db:deploy` in production.
