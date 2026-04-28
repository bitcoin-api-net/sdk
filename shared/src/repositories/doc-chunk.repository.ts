import { DocChunk } from '../../../generated/prisma/client.js';
import { googleAiProvider } from '../providers/google-ai.provider.js';
import { textChunker } from '../services/text-chunker.service.js';
import { sha256 } from '../crypto.js';
import { toVectorLiteral } from './shared/utils.js';
import { PrismaClient, prismaClient } from './client.js';
import type { DocInput, VectorizeStats } from './doc-chunk.repository/types.js';
import { VectorChunkBaseRepository } from './vector-chunk-base.repository.js';

export class DocChunkRepository extends VectorChunkBaseRepository<PrismaClient['docChunk']> {
  async vectorize(doc: DocInput): Promise<VectorizeStats> {
    const stats: VectorizeStats = { created: 0, updated: 0, skipped: 0 };
    const chunks = await textChunker.chunkMarkdown(doc.text);

    const existing = await this.model.findMany({
      where: { url: doc.url },
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
        INSERT INTO "doc_chunks" ("id", "url", "anchor", "title", "section", "text", "content_hash", "embedding", "created_at", "updated_at")
        VALUES (gen_random_uuid()::text, ${doc.url}, ${chunk.anchor}, ${chunk.title}, ${doc.section ?? null}, ${chunk.text}, ${contentHash}, ${embeddingLiteral}::vector, NOW(), NOW())
        ON CONFLICT ("url", "anchor") DO UPDATE SET
          "title" = EXCLUDED."title",
          "section" = EXCLUDED."section",
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
        where: { url: doc.url, anchor: { in: orphanAnchors } },
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

  async searchByVector(embedding: number[], k = 5): Promise<DocChunk[]> {
    const literal = toVectorLiteral(embedding);
    const rows = await prismaClient.$queryRaw<DocChunk[]>`
      SELECT "id", "url", "anchor", "title", "section", "text",
             "content_hash" AS "contentHash",
             "created_at" AS "createdAt",
             "updated_at" AS "updatedAt"
      FROM "doc_chunks"
      ORDER BY "embedding" <=> ${literal}::vector
      LIMIT ${k}
    `;
    return rows;
  }

  async findByUrl(url: string): Promise<DocChunk[]> {
    return this.model.findMany({
      where: { url },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const docChunkRepository = new DocChunkRepository(prismaClient.docChunk);
