# Bitcoin API TypeScript SDK

A lightweight, type-safe TypeScript SDK for the [Bitcoin API](https://bitcoin-api.net), built on top of `openapi-fetch`.

## Installation

```bash
npm install @bitcoin-api/sdk
```

## Quick Start

```typescript
import { createBitcoinClient } from '@bitcoin-api/sdk';

const client = createBitcoinClient({
  apiKey: 'your-api-key-here',
  // baseUrl: 'https://bitcoin-api.net' // Optional, defaults to production
});

// Example: Get current Bitcoin price
const { data, error } = await client.GET('/api/v1/prices/current', {
  params: {
    query: { symbol: 'btcusdt' }
  }
});

if (data) {
  console.log(`Current price: ${data.price}`);
}
```

## Features

- **Full Type Safety:** Automatically generated types from our OpenAPI schema.
- **Lightweight:** Tiny footprint with minimal dependencies.
- **Promise-based:** Modern API using async/await.
- **Customizable:** Easily override the base URL or add custom headers.

## Documentation

For more detailed documentation, visit [bitcoin-api.net/docs](https://bitcoin-api.net/docs).

## License

MIT
