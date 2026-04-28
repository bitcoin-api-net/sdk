import { PrismaClient } from '../client.js';

export type UpdatableRecipeChunk = Parameters<PrismaClient['recipeChunk']['update']>[0]['data'];

export type RecipeInput = {
  url: string;
  title: string;
  description?: string;
  language: string;
  difficulty?: string;
  tags: string[];
  runUrl?: string;
  endpoints: string[];
  text: string;
};

export type VectorizeStats = {
  created: number;
  updated: number;
  skipped: number;
};
