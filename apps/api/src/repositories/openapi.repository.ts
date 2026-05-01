import {
  FoundOperation,
  HTTP_METHODS,
  HttpMethod,
  OpenApiSchema,
  OperationSummary,
} from './openapi.repository/types.js';
import fs from 'node:fs';
import path from 'node:path';

// apps/api/src/repositories -> apps/api/files/openapi.json
const OPENAPI_FILE_PATH = path.join(import.meta.dirname, '..', '..', 'files', 'openapi.json');

export class OpenApiRepository {
  private schema: OpenApiSchema | null = null;

  save(schema: object): void {
    this.schema = schema as OpenApiSchema;
    this.writeToFile();
  }

  writeToFile(): string {
    fs.mkdirSync(path.dirname(OPENAPI_FILE_PATH), { recursive: true });
    fs.writeFileSync(OPENAPI_FILE_PATH, JSON.stringify(this.getSchema(), null, 2));
    return OPENAPI_FILE_PATH;
  }

  getSchema(): OpenApiSchema {
    if (!this.schema) {
      throw new Error('OpenAPI schema is not initialized. Call save() first.');
    }
    return this.schema;
  }

  findOperation(method: string, requestPath: string): FoundOperation | null {
    const m = method.toLowerCase();
    if (!HTTP_METHODS.includes(m as HttpMethod)) return null;

    const paths = this.getSchema().paths ?? {};
    const candidates = [requestPath, this.normalizePath(requestPath)];

    for (const candidate of candidates) {
      const item = paths[candidate];
      const op = item?.[m];
      if (op) return { method: m as HttpMethod, path: candidate, operation: op };
    }
    return null;
  }

  findOperationById(operationId: string): FoundOperation | null {
    const paths = this.getSchema().paths ?? {};
    for (const [p, item] of Object.entries(paths)) {
      if (!item) continue;
      for (const m of HTTP_METHODS) {
        const op = item[m];
        if (op?.operationId === operationId) {
          return { method: m, path: p, operation: op };
        }
      }
    }
    return null;
  }

  listOperations(): OperationSummary[] {
    const paths = this.getSchema().paths ?? {};
    const result: OperationSummary[] = [];
    for (const [p, item] of Object.entries(paths)) {
      if (!item) continue;
      for (const m of HTTP_METHODS) {
        const op = item[m];
        if (!op?.operationId) continue;
        result.push({
          operationId: op.operationId,
          method: m,
          path: p,
          summary: op.summary,
          description: op.description,
          tags: op.tags,
        });
      }
    }
    return result;
  }

  private normalizePath(p: string): string {
    if (p.startsWith('/')) return p;
    return `/${p}`;
  }
}

export const openApiRepository = new OpenApiRepository();
