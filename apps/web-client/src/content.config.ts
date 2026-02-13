import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const statsItemSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const endpointItemSchema = z.object({
  category: z.string(),
  description: z.string(),
});

const homeCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    hero: z.object({
      badge: z.string(),
      title: z.string(),
      titleAccent: z.string(),
      description: z.string(),
      ctaPrimary: z.string(),
      ctaSecondary: z.string(),
    }),
    stats: z.array(statsItemSchema),
    whyChoose: z.object({
      title: z.string(),
      items: z.array(z.string()),
    }),
    quickStart: z.object({
      title: z.string(),
      text: z.string(),
      code: z.string(),
    }),
    endpoints: z.object({
      title: z.string(),
      intro: z.string(),
      items: z.array(endpointItemSchema),
    }),
    cta: z.object({
      title: z.string(),
      text: z.string(),
      buttonText: z.string(),
    }),
  }),
});

export const collections = {
  home: homeCollection,
};
