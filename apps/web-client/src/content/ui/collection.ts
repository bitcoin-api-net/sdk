import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const uiCollection = defineCollection({
  loader: glob({ pattern: './*.json', base: './src/content/ui' }),
  schema: z.object({
    features: z.string(),
    pricing: z.string(),
    endpoints: z.string(),
    docs: z.string(),
    signIn: z.string(),
    getStarted: z.string(),
    product: z.string(),
    resources: z.string(),
    documentation: z.string(),
    apiReference: z.string(),
    changelog: z.string(),
    company: z.string(),
    about: z.string(),
    contact: z.string(),
    legal: z.string(),
    privacy: z.string(),
    terms: z.string(),
    allRightsReserved: z.string(),
    blockNotFound: z.string(),
    thisAddressDoesntExistInOurMempool: z.string(),
    backToHome: z.string(),
    viewDocs: z.string(),
  }),
});
