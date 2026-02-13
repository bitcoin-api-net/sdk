import { JSONSchemaType } from 'lib/src/validation.js';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

export type ResponseData = {
  status: string;
};

const responseSchema: JSONSchemaType<ResponseData> = {
  type: 'object',
  properties: {
    status: { type: 'string' },
  },
  required: ['status'],
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.get<{
    Reply: ResponseData;
  }>(
    '/healthcheck',
    {
      schema: {
        response: {
          200: responseSchema,
        },
      },
      config: { auth: 'optional' },
    },
    async (req, res) => {
      return res.status(200).send({ status: 'ok' });
    }
  );
}
