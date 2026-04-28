import type { Loader } from 'astro/loaders';
import fs from 'node:fs';
import path from 'node:path';
import env, { required } from 'shared/src/env.js';

const PROJECT_DIR = required(env.PROJECT_DIR);
const OPENAPI_FILE = path.resolve(PROJECT_DIR, 'apps/api/files/openapi.json');

type OpenApiOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  requestBody?: unknown;
  parameters?: unknown[];
  responses?: Record<string, unknown>;
};

type OpenApiSchema = {
  paths?: Record<string, Record<string, OpenApiOperation>>;
};

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

export function openapiLoader(): Loader {
  return {
    name: 'openapi-loader',
    load: async ({ store, logger }) => {
      logger.info(`Loading OpenAPI schema from ${OPENAPI_FILE}`);
      const raw = fs.readFileSync(OPENAPI_FILE, 'utf-8');
      const schema = JSON.parse(raw) as OpenApiSchema;
      store.clear();

      if (!schema.paths) return;

      for (const [routePath, methods] of Object.entries(schema.paths)) {
        for (const method of HTTP_METHODS) {
          const op = methods[method];
          if (!op) continue;

          const operationId = op.operationId ?? `${method}_${routePath}`.replace(/[^a-zA-Z0-9]+/g, '_');
          const id = operationId;

          const requestSchema = (op.requestBody ?? null) as unknown;
          const responseSchemas = op.responses ?? {};
          const parameters = op.parameters ?? [];

          store.set({
            id,
            data: {
              operationId,
              method: method.toUpperCase(),
              path: routePath,
              summary: op.summary ?? '',
              description: op.description ?? '',
              tags: op.tags ?? [],
              requestSchema,
              responseSchemas,
              parameters,
            },
          });
        }
      }
    },
  };
}
