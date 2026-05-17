import test from 'node:test';
import assert from 'node:assert/strict';
import { createBitcoinClient } from './index.js';

test('Bitcoin SDK Client', async (t) => {
  await t.test('should create client with default base URL', () => {
    const client = createBitcoinClient();
    assert.ok(client);
    assert.ok(typeof client.GET === 'function');
  });

  await t.test('should accept custom base URL and API key', () => {
    const client = createBitcoinClient({
      baseUrl: 'https://test.bitcoin-api.net',
      apiKey: 'test-secret-key',
    });
    assert.ok(client);
  });
});
