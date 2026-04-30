import { FoundOperation, HTTP_METHODS, HttpMethod, OpenApiSchema } from './openapi.repository/types.js';
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

  private normalizePath(p: string): string {
    if (p.startsWith('/')) return p;
    return `/${p}`;
  }
}

export const openApiRepository = new OpenApiRepository();
