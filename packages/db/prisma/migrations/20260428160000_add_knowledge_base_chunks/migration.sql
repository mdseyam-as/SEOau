-- Add chunk-level storage for Knowledge Base RAG retrieval.
CREATE TABLE "KnowledgeBaseChunk" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB,
    "tokenEstimate" INTEGER NOT NULL DEFAULT 0,
    "charStart" INTEGER NOT NULL DEFAULT 0,
    "charEnd" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeBaseChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeBaseChunk_knowledgeBaseId_chunkIndex_key"
    ON "KnowledgeBaseChunk"("knowledgeBaseId", "chunkIndex");

CREATE INDEX "KnowledgeBaseChunk_knowledgeBaseId_idx"
    ON "KnowledgeBaseChunk"("knowledgeBaseId");

ALTER TABLE "KnowledgeBaseChunk"
    ADD CONSTRAINT "KnowledgeBaseChunk_knowledgeBaseId_fkey"
    FOREIGN KEY ("knowledgeBaseId")
    REFERENCES "KnowledgeBase"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
