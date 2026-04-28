import { ApiChunk } from '../../../generated/prisma/client.js';
import { googleAiProvider } from '../providers/google-ai.provider.js';
import { sha256 } from '../crypto.js';
import { toVectorLiteral } from './shared/utils.js';
import { PrismaClient, prismaClient } from './client.js';
import type { ApiInput, VectorizeStats } from './api-chunk.repository/types.js';
import { VectorChunkBaseRepository } from './vector-chunk-base.repository.js';

export class ApiChunkRepository extends VectorChunkBaseRepository<PrismaClient['apiChunk']> {
  async vectorizeApi(api: ApiInput): Promise<VectorizeStats> {
    const stats: VectorizeStats = { created: 0, updated: 0, skipped: 0 };
    const text = buildApiEmbeddingText(api);
    const contentHash = sha256(text);

    const existing = await this.model.findUnique({
      where: { operationId: api.operationId },
      select: { contentHash: true },
    });

    if (existing?.contentHash === contentHash) {
      stats.skipped += 1;
      return stats;
    }

    const embedding = await googleAiProvider.embed(text, 'RETRIEVAL_DOCUMENT');
    const embeddingLiteral = toVectorLiteral(embedding);
    const requestSchemaJson = JSON.stringify(api.requestSchema ?? null);
    const responseSchemasJson = JSON.stringify(api.responseSchemas);
    const parametersJson = JSON.stringify(api.parameters);

    await prismaClient.$executeRaw`
      INSERT INTO "api_chunks" (
        "id", "operation_id", "method", "path", "summary", "description",
        "tags", "request_schema", "response_schemas", "parameters", "text",
        "content_hash", "embedding", "created_at", "updated_at"
      )
      VALUES (
        gen_random_uuid()::text,
        ${api.operationId}, ${api.method}, ${api.path},
        ${api.summary ?? null}, ${api.description ?? null},
        ${api.tags}::text[],
        ${requestSchemaJson}::jsonb, ${responseSchemasJson}::jsonb, ${parametersJson}::jsonb,
        ${text}, ${contentHash}, ${embeddingLiteral}::vector, NOW(), NOW()
      )
      ON CONFLICT ("operation_id") DO UPDATE SET
        "method" = EXCLUDED."method",
        "path" = EXCLUDED."path",
        "summary" = EXCLUDED."summary",
        "description" = EXCLUDED."description",
        "tags" = EXCLUDED."tags",
        "request_schema" = EXCLUDED."request_schema",
        "response_schemas" = EXCLUDED."response_schemas",
        "parameters" = EXCLUDED."parameters",
        "text" = EXCLUDED."text",
        "content_hash" = EXCLUDED."content_hash",
        "embedding" = EXCLUDED."embedding",
        "updated_at" = NOW()
    `;

    if (existing) {
      stats.updated += 1;
    } else {
      stats.created += 1;
    }
    return stats;
  }

  async deleteOrphansExcept(keepOperationIds: string[]): Promise<number> {
    const result = await this.model.deleteMany({
      where: { operationId: { notIn: keepOperationIds } },
    });
    return result.count;
  }

  async searchByVector(embedding: number[], k = 5): Promise<ApiChunk[]> {
    const literal = toVectorLiteral(embedding);
    const rows = await prismaClient.$queryRaw<ApiChunk[]>`
      SELECT "id",
             "operation_id" AS "operationId",
             "method", "path", "summary", "description",
             "tags",
             "request_schema" AS "requestSchema",
             "response_schemas" AS "responseSchemas",
             "parameters", "text",
             "content_hash" AS "contentHash",
             "created_at" AS "createdAt",
             "updated_at" AS "updatedAt"
      FROM "api_chunks"
      ORDER BY "embedding" <=> ${literal}::vector
      LIMIT ${k}
    `;
    return rows;
  }

  async findByOperationId(operationId: string): Promise<ApiChunk | null> {
    return this.model.findUnique({ where: { operationId } });
  }
}

export const apiChunkRepository = new ApiChunkRepository(prismaClient.apiChunk);

function buildApiEmbeddingText(api: ApiInput): string {
  const parts = [
    `${api.method} ${api.path}`,
    api.summary,
    api.description,
    api.tags.length ? `Tags: ${api.tags.join(', ')}` : null,
  ].filter(Boolean);
  return parts.join('\n\n');
}
