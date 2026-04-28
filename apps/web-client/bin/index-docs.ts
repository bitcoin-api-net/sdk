import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from 'shared/src/logging.js';
import { apiChunkRepository } from 'shared/src/repositories/api-chunk.repository.js';
import type { ApiInput } from 'shared/src/repositories/api-chunk.repository/types.js';
import { connectToDb, disconnectFromDb } from 'shared/src/repositories/client.js';
import { docChunkRepository } from 'shared/src/repositories/doc-chunk.repository.js';
import type { DocInput, VectorizeStats } from 'shared/src/repositories/doc-chunk.repository/types.js';
import { recipeChunkRepository } from 'shared/src/repositories/recipe-chunk.repository.js';
import type { RecipeInput } from 'shared/src/repositories/recipe-chunk.repository/types.js';

type DocsIndexPayload = {
  docs: DocInput[];
  recipes: RecipeInput[];
  api: ApiInput[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_FILE = path.resolve(__dirname, '..', 'dist', 'docs-index.json');

async function main() {
  if (!fs.existsSync(INDEX_FILE)) {
    throw new Error(`Index file not found at ${INDEX_FILE}. Run 'astro build' first.`);
  }

  const payload = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8')) as DocsIndexPayload;
  logger.info(
    { docs: payload.docs.length, recipes: payload.recipes.length, api: payload.api.length },
    'Loaded docs index'
  );

  await connectToDb();

  try {
    const docStats = aggregateStats();
    for (const doc of payload.docs) {
      const stats = await docChunkRepository.vectorize(doc);
      addStats(docStats, stats);
      logger.info({ url: doc.url, ...stats }, 'doc vectorized');
    }
    logger.info(docStats, 'docs total');

    const recipeStats = aggregateStats();
    for (const recipe of payload.recipes) {
      const stats = await recipeChunkRepository.vectorize(recipe);
      addStats(recipeStats, stats);
      logger.info({ url: recipe.url, ...stats }, 'recipe vectorized');
    }
    logger.info(recipeStats, 'recipes total');

    const apiStats = aggregateStats();
    for (const api of payload.api) {
      const stats = await apiChunkRepository.vectorizeApi(api);
      addStats(apiStats, stats);
      logger.info({ operationId: api.operationId, ...stats }, 'api vectorized');
    }
    logger.info(apiStats, 'api total');

    const docUrls = payload.docs.map((d) => d.url);
    const recipeUrls = payload.recipes.map((r) => r.url);
    const apiOperationIds = payload.api.map((a) => a.operationId);

    const removedDocs = await docChunkRepository.deleteOrphansExcept(docUrls);
    const removedRecipes = await recipeChunkRepository.deleteOrphansExcept(recipeUrls);
    const removedApi = await apiChunkRepository.deleteOrphansExcept(apiOperationIds);

    logger.info({ removedDocs, removedRecipes, removedApi }, 'orphans removed');
  } finally {
    await disconnectFromDb();
  }
}

function aggregateStats(): VectorizeStats {
  return { created: 0, updated: 0, skipped: 0 };
}

function addStats(target: VectorizeStats, src: VectorizeStats) {
  target.created += src.created;
  target.updated += src.updated;
  target.skipped += src.skipped;
}

main().catch((err) => {
  logger.error({ err }, 'docs:index failed');
  process.exit(1);
});
