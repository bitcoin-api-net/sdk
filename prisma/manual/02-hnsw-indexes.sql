-- Run AFTER `prisma db push`. Tables must already exist.
-- Prisma can't manage custom index types (hnsw + vector_cosine_ops).
CREATE INDEX IF NOT EXISTS "doc_chunks_embedding_hnsw_idx"
  ON "doc_chunks" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS "recipe_chunks_embedding_hnsw_idx"
  ON "recipe_chunks" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS "api_chunks_embedding_hnsw_idx"
  ON "api_chunks" USING hnsw ("embedding" vector_cosine_ops);
