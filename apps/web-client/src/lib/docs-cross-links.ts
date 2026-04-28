import { getCollection } from 'astro:content';

export type RecipeRef = {
  id: string;
  title: string;
  description: string;
  href: string;
  language: string;
};

export type EndpointRef = {
  operationId: string;
  method: string;
  path: string;
  summary: string;
  href: string;
};

export async function recipesForEndpoint(operationId: string): Promise<RecipeRef[]> {
  const recipes = await getCollection('recipes');
  return recipes
    .filter((r) => !r.id.startsWith('_') && r.data.endpoints.includes(operationId))
    .map((r) => ({
      id: r.id,
      title: r.data.title,
      description: r.data.description,
      href: `/docs/recipes/${r.id}`,
      language: r.data.language,
    }));
}

export async function endpointsForRecipe(endpointIds: string[]): Promise<EndpointRef[]> {
  if (endpointIds.length === 0) return [];
  const api = await getCollection('api');
  const byId = new Map(api.map((e) => [e.data.operationId, e]));
  const refs: EndpointRef[] = [];
  for (const id of endpointIds) {
    const entry = byId.get(id);
    if (!entry) continue;
    refs.push({
      operationId: entry.data.operationId,
      method: entry.data.method,
      path: entry.data.path,
      summary: entry.data.summary,
      href: `/docs/api/${entry.id}`,
    });
  }
  return refs;
}
