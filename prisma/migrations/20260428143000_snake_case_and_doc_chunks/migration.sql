-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- DropTable (legacy PascalCase user table from baseline; recreated as snake_case below)
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_chunks" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "anchor" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "section" TEXT,
    "text" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_chunks" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "anchor" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT NOT NULL,
    "difficulty" TEXT,
    "tags" TEXT[],
    "run_url" TEXT,
    "endpoints" TEXT[],
    "text" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_chunks" (
    "id" TEXT NOT NULL,
    "operation_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "request_schema" JSONB,
    "response_schemas" JSONB NOT NULL,
    "parameters" JSONB NOT NULL,
    "text" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "doc_chunks_url_anchor_key" ON "doc_chunks"("url", "anchor");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_chunks_url_anchor_key" ON "recipe_chunks"("url", "anchor");

-- CreateIndex
CREATE UNIQUE INDEX "api_chunks_operation_id_key" ON "api_chunks"("operation_id");

-- HNSW indexes for vector cosine search
CREATE INDEX "doc_chunks_embedding_hnsw_idx" ON "doc_chunks" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "recipe_chunks_embedding_hnsw_idx" ON "recipe_chunks" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "api_chunks_embedding_hnsw_idx" ON "api_chunks" USING hnsw ("embedding" vector_cosine_ops);
