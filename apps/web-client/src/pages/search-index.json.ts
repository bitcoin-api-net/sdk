import { create, insertMultiple, save } from '@orama/orama';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

type IndexEntry = {
  id: string;
  kind: 'doc' | 'recipe' | 'api';
  title: string;
  section: string;
  description: string;
  body: string;
  url: string;
  tags: string[];
};

export const GET: APIRoute = async () => {
  const docs = await getCollection('docs');
  const recipes = await getCollection('recipes');
  const api = await getCollection('api');

  const entries: IndexEntry[] = [];

  for (const d of docs) {
    entries.push({
      id: `doc:${d.id}`,
      kind: 'doc',
      title: d.data.title,
      section: d.data.section,
      description: d.data.description,
      body: d.body ?? '',
      url: `/docs/${d.id}`,
      tags: d.data.tags,
    });
  }

  for (const r of recipes) {
    if (r.id.startsWith('_')) continue;
    entries.push({
      id: `recipe:${r.id}`,
      kind: 'recipe',
      title: r.data.title,
      section: 'Recipes',
      description: r.data.description,
      body: r.body ?? '',
      url: `/docs/recipes/${r.id}`,
      tags: r.data.tags,
    });
  }

  for (const e of api) {
    entries.push({
      id: `api:${e.data.operationId}`,
      kind: 'api',
      title: e.data.summary || e.data.operationId,
      section: `API · ${e.data.method} ${e.data.path}`,
      description: e.data.description,
      body: `${e.data.method} ${e.data.path}\n${e.data.description}`,
      url: `/docs/api/${e.id}`,
      tags: e.data.tags,
    });
  }

  const db = create({
    schema: {
      id: 'string',
      kind: 'string',
      title: 'string',
      section: 'string',
      description: 'string',
      body: 'string',
      url: 'string',
      tags: 'string[]',
    },
    components: {
      tokenizer: { language: 'english', stemming: true },
    },
  });

  await insertMultiple(db, entries);
  const serialized = await save(db);

  return new Response(JSON.stringify(serialized), {
    headers: { 'Content-Type': 'application/json' },
  });
};
