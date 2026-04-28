import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import env, { required } from 'shared/src/env.js';
import { ValidationError } from 'shared/src/errors.js';
import { userRepository } from 'shared/src/repositories/user.repository.js';
import { signUpUsecase } from '#src/usecases/sign-up.usecase.js';

const NODE_ENV = required(env.NODE_ENV);
const SITE_URL = required(env.SITE_URL);

type RequestQuery = {
  token: string;
};

const querySchema: JSONSchemaType<RequestQuery> = {
  type: 'object',
  properties: {
    token: { type: 'string' },
  },
  required: ['token'],
  additionalProperties: false,
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Querystring: RequestQuery }>({
    method: 'GET',
    url: '/verify-email',
    schema: {
      operationId: 'verifyEmail',
      summary: 'Verify email by token',
      description: 'Activates the user account associated with the verification token and sets the access cookie.',
      tags: ['auth'],
      querystring: querySchema,
    },
    handler: async (req, reply) => {
      let email: string;
      try {
        ({ email } = signUpUsecase.verifyToken(req.query.token));
      } catch {
        throw new ValidationError('Invalid or expired verification link');
      }

      const user = await userRepository.findFirst({ where: { email } });
      if (!user) {
        throw new ValidationError('User not found');
      }

      if (user.isActive) {
        return reply.redirect(SITE_URL);
      }

      await userRepository.update({
        where: { email },
        data: { isActive: true },
      });

      const token = app.jwt.sign({ email });

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
