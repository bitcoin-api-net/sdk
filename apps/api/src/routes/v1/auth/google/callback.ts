import { loginWithGoogleUsecase } from '#src/usecases/login-with-google.usecase.js';
import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import env, { required } from 'shared/src/env.js';

const NODE_ENV = required(env.NODE_ENV);
const SITE_URL = required(env.SITE_URL);

type RequestQuery = {
  code: string;
};

const querySchema: JSONSchemaType<RequestQuery> = {
  type: 'object',
  properties: {
    code: { type: 'string' },
  },
  required: ['code'],
  additionalProperties: false,
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Querystring: RequestQuery }>({
    method: 'GET',
    url: '/callback',
    schema: {
      operationId: 'googleCallback',
      summary: 'Google OAuth callback',
      description: 'Handles the redirect from Google, exchanges the auth code, and sets the access cookie.',
      tags: ['auth'],
      querystring: querySchema,
      'x-default-rate-limit': 10,
    },
    handler: async (req, reply) => {
      const user = await loginWithGoogleUsecase.execute({ code: req.query.code });

      const token = app.jwt.sign({ email: user.email });

      return reply
        .setCookie('access', token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        })
        .redirect(SITE_URL);
    },
  });
}
