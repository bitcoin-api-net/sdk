import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { ApiKey } from 'shared/generated/prisma/client.js';

export type ApiKeyView = {
  id: string;
  name: string;
  token: string;
  isActive: boolean;
  createdAt: string;
};

export const apiKeyViewSchema: JSONSchemaType<ApiKeyView> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    token: { type: 'string' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string' },
  },
  required: ['id', 'name', 'token', 'isActive', 'createdAt'],
};

export function toApiKeyView(apiKey: ApiKey): ApiKeyView {
  return {
    id: apiKey.id,
    name: apiKey.name,
    token: apiKey.token,
    isActive: apiKey.isActive,
    createdAt: apiKey.createdAt.toISOString(),
  };
}
