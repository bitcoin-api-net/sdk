import { PrismaClient } from '../client.js';

export type UpdatableDocChunk = Parameters<PrismaClient['docChunk']['update']>[0]['data'];

export type DocInput = {
  url: string;
  title: string;
  section?: string;
  text: string;
};

export type VectorizeStats = {
  created: number;
  updated: number;
  skipped: number;
};
