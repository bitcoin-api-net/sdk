import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { ApiInput } from 'shared/src/repositories/api-chunk.repository/types.js';
import type { DocInput } from 'shared/src/repositories/doc-chunk.repository/types.js';
import type { RecipeInput } from 'shared/src/repositories/recipe-chunk.repository/types.js';

export const prerender = true;

export type DocsIndexPayload = {
  docs: DocInput[];
  recipes: RecipeInput[];
  api: ApiInput[];
};

export const GET: APIRoute = async () => {
  const docsCollection = await getCollection('docs');
  const recipesCollection = await getCollection('recipes');
  const apiCollection = await getCollection('api');

  const docs: DocInput[] = docsCollection.map((d) => ({
    url: `/docs/${d.id}`,
    title: d.data.title,
    section: d.data.section,
    text: d.body ?? '',
  }));

  const recipes: RecipeInput[] = recipesCollection
    .filter((r) => !r.id.startsWith('_'))
    .map((r) => ({
      url: `/docs/recipes/${r.id}`,
      title: r.data.title,
      description: r.data.description,
      language: r.data.language,
      difficulty: r.data.difficulty,
      tags: r.data.tags,
      runUrl: r.data.runUrl,
      endpoints: r.data.endpoints,
      text: r.body ?? '',
    }));

  const api: ApiInput[] = apiCollection.map((e) => ({
    operationId: e.data.operationId,
    method: e.data.method,
    path: e.data.path,
    summary: e.data.summary,
    description: e.data.description,
    tags: e.data.tags,
    requestSchema: e.data.requestSchema,
    responseSchemas: e.data.responseSchemas,
    parameters: e.data.parameters,
  }));

  const payload: DocsIndexPayload = { docs, recipes, api };

  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
};
