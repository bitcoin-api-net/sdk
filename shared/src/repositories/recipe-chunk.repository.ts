import { RecipeChunk } from '../../../generated/prisma/client.js';
import { googleAiProvider } from '../providers/google-ai.provider.js';
import { textChunker } from '../services/text-chunker.service.js';
import { sha256, uuid7 } from '../crypto.js';
import { toVectorLiteral } from './shared/utils.js';
import { PrismaClient, prismaClient } from './client.js';
import type { RecipeInput, VectorizeStats } from './recipe-chunk.repository/types.js';
import { VectorChunkBaseRepository } from './vector-chunk-base.repository.js';

export class RecipeChunkRepository extends VectorChunkBaseRepository<PrismaClient['recipeChunk']> {
  async vectorize(recipe: RecipeInput): Promise<VectorizeStats> {
    const stats: VectorizeStats = { created: 0, updated: 0, skipped: 0 };
    const chunks = await textChunker.chunkMarkdown(recipe.text);

    const existing = await this.model.findMany({
      where: { url: recipe.url },
      select: { anchor: true, contentHash: true },
    });
    const existingByAnchor = new Map(existing.map((e) => [e.anchor, e.contentHash]));
    const seenAnchors = new Set<string>();

    for (const chunk of chunks) {
      seenAnchors.add(chunk.anchor);
      const contentHash = sha256(chunk.text);
      const prevHash = existingByAnchor.get(chunk.anchor);

      if (prevHash === contentHash) {
        stats.skipped += 1;
        continue;
      }

      const embedding = await googleAiProvider.embed(chunk.text, 'RETRIEVAL_DOCUMENT');
      const embeddingLiteral = toVectorLiteral(embedding);

      await prismaClient.$executeRaw`
        INSERT INTO "recipe_chunks" (
          "id", "url", "anchor", "title", "description", "language", "difficulty",
          "tags", "run_url", "endpoints", "text", "content_hash", "embedding", "created_at", "updated_at"
        )
        VALUES (
          ${uuid7()},
          ${recipe.url}, ${chunk.anchor}, ${chunk.title},
          ${recipe.description ?? null}, ${recipe.language}, ${recipe.difficulty ?? null},
          ${recipe.tags}::text[], ${recipe.runUrl ?? null}, ${recipe.endpoints}::text[],
          ${chunk.text}, ${contentHash}, ${embeddingLiteral}::vector, NOW(), NOW()
        )
        ON CONFLICT ("url", "anchor") DO UPDATE SET
          "title" = EXCLUDED."title",
          "description" = EXCLUDED."description",
          "language" = EXCLUDED."language",
          "difficulty" = EXCLUDED."difficulty",
          "tags" = EXCLUDED."tags",
          "run_url" = EXCLUDED."run_url",
          "endpoints" = EXCLUDED."endpoints",
          "text" = EXCLUDED."text",
          "content_hash" = EXCLUDED."content_hash",
          "embedding" = EXCLUDED."embedding",
          "updated_at" = NOW()
      `;

      if (prevHash) {
        stats.updated += 1;
      } else {
        stats.created += 1;
      }
    }

    const orphanAnchors = existing
      .map((e) => e.anchor)
      .filter((anchor) => !seenAnchors.has(anchor));
    if (orphanAnchors.length > 0) {
      await this.model.deleteMany({
        where: { url: recipe.url, anchor: { in: orphanAnchors } },
      });
    }

    return stats;
  }

  async deleteOrphansExcept(keepUrls: string[]): Promise<number> {
    const result = await this.model.deleteMany({
      where: { url: { notIn: keepUrls } },
    });
    return result.count;
  }

  async searchByVector(embedding: number[], k = 5): Promise<RecipeChunk[]> {
    const literal = toVectorLiteral(embedding);
    const rows = await prismaClient.$queryRaw<RecipeChunk[]>`
      SELECT "id", "url", "anchor", "title", "description", "language", "difficulty",
             "tags",
             "run_url" AS "runUrl",
             "endpoints", "text",
             "content_hash" AS "contentHash",
             "created_at" AS "createdAt",
             "updated_at" AS "updatedAt"
      FROM "recipe_chunks"
      ORDER BY "embedding" <=> ${literal}::vector
      LIMIT ${k}
    `;
    return rows;
  }

  async findByEndpoint(operationId: string): Promise<RecipeChunk[]> {
    const rows = await prismaClient.$queryRaw<RecipeChunk[]>`
      SELECT "id", "url", "anchor", "title", "description", "language", "difficulty",
             "tags",
             "run_url" AS "runUrl",
             "endpoints", "text",
             "content_hash" AS "contentHash",
             "created_at" AS "createdAt",
             "updated_at" AS "updatedAt"
      FROM "recipe_chunks"
      WHERE ${operationId} = ANY("endpoints")
    `;
    return rows;
  }
}

export const recipeChunkRepository = new RecipeChunkRepository(prismaClient.recipeChunk);
