import { PrismaClient } from '../client.js';

export type UpdatableApiChunk = Parameters<PrismaClient['apiChunk']['update']>[0]['data'];

export type ApiInput = {
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  requestSchema: unknown;
  responseSchemas: Record<string, unknown>;
  parameters: unknown[];
};

export type VectorizeStats = {
  created: number;
  updated: number;
  skipped: number;
};
