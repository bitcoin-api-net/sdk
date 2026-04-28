import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import bcrypt from 'bcrypt';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import env, { required } from 'shared/src/env.js';
import { ForbiddenError, UnauthorizedError } from 'shared/src/errors.js';
import { userRepository } from 'shared/src/repositories/user.repository.js';

const NODE_ENV = required(env.NODE_ENV);

type RequestData = {
  email: string;
  password: string;
};

type ResponseData = {
  email: string;
};

const bodySchema: JSONSchemaType<RequestData> = {
  type: 'object',
  properties: {
    email: { type: 'string' },
    password: { type: 'string' },
  },
  required: ['email', 'password'],
};

const responseSchema: JSONSchemaType<ResponseData> = {
  type: 'object',
  properties: {
    email: { type: 'string' },
  },
  required: ['email'],
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Body: RequestData; Reply: ResponseData }>({
    method: 'POST',
    url: '/login',
    schema: {
      operationId: 'login',
      summary: 'Log in with email and password',
      description: 'Authenticates a user and sets an HttpOnly access cookie.',
      tags: ['auth'],
      body: bodySchema,
      response: {
        200: responseSchema,
      },
    },
    handler: async (req, reply) => {
      const { email, password } = req.body;

      const user = await userRepository.findFirst({
        where: { email },
        select: { password: true, isActive: true },
      });

      if (!user?.password) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      if (!user.isActive) {
        throw new ForbiddenError('Please verify your email before signing in');
      }

      const token = app.jwt.sign({ email });

      return reply
        .setCookie('access', token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        })
        .status(200)
        .send({ email });
    },
  });
}
