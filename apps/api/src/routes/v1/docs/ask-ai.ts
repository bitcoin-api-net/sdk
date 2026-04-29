import { askAiUseCase, AskAiEvent } from '#src/usecases/docs/ask-ai.usecase.js';
import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv/dist/ajv.js';
import { SSEMessage } from '@fastify/sse';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';

type RequestData = {
  query: string;
};

const bodySchema: JSONSchemaType<RequestData> = {
  type: 'object',
  properties: {
    query: { type: 'string', minLength: 1, maxLength: 1000 },
  },
  required: ['query'],
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Body: RequestData }>({
    method: 'POST',
    url: '/ask-ai',
    sse: { heartbeat: false },
    schema: {
      operationId: 'askAiDocs',
      summary: 'Ask AI about Bitcoin API docs',
      description:
        'Streams an AI-generated answer over Server-Sent Events. Events: `sources`, `token`, `done`. Client MUST send `Accept: text/event-stream`.',
      tags: ['docs'],
      body: bodySchema,
    },
    handler: async (req, reply) => {
      await reply.sse.send(toSseMessages(askAiUseCase.execute({ query: req.body.query })));
    },
  });
}

async function* toSseMessages(events: AsyncIterable<AskAiEvent>): AsyncIterable<SSEMessage> {
  for await (const e of events) {
    if (e.type === 'done') {
      yield { event: 'done', data: {} };
    } else {
      yield { event: e.type, data: e.data };
    }
  }
}
