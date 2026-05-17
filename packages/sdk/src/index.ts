import type { paths } from './schema.js';
import createClient from 'openapi-fetch';

export type BitcoinApiClientOptions = {
  baseUrl?: string;
  apiKey?: string;
};

export function createBitcoinClient(options: BitcoinApiClientOptions = {}) {
  const client = createClient<paths>({
    baseUrl: options.baseUrl ?? 'https://bitcoin.net/',
  });

  if (options.apiKey) {
    client.use({
      onRequest({ request }) {
        request.headers.set('Authorization', `Bearer ${options.apiKey}`);
        return request;
      },
    });
  }

  return client;
}

export type BitcoinApiClient = ReturnType<typeof createBitcoinClient>;
export type * from './schema.js';
