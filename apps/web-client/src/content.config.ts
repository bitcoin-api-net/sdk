import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';
import { openapiLoader } from './content/loaders/openapi.js';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.string(),
    order: z.number().default(0),
    tags: z.array(z.string()).default([]),
  }),
});

const recipes = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/recipes' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    endpoints: z.array(z.string()).default([]),
    language: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    tags: z.array(z.string()).default([]),
    runUrl: z.string().url().optional(),
  }),
});

const api = defineCollection({
  loader: openapiLoader(),
  schema: z.object({
    operationId: z.string(),
    method: z.string(),
    path: z.string(),
    summary: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    requestSchema: z.unknown().nullable(),
    responseSchemas: z.record(z.unknown()).default({}),
    parameters: z.array(z.unknown()).default([]),
  }),
});

export const collections = { docs, recipes, api };
