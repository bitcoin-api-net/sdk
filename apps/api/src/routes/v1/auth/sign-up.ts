import { signUpUsecase } from '#src/usecases/sign-up.usecase.js';
import { JSONSchemaType } from '@fastify/ajv-compiler/node_modules/ajv';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';

type RequestData = {
  email: string;
  password: string;
};

type ResponseData = {
  message: string;
};

const bodySchema: JSONSchemaType<RequestData> = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email', maxLength: 255 },
    password: { type: 'string', minLength: 8, maxLength: 255 },
  },
  required: ['email', 'password'],
};

const responseSchema: JSONSchemaType<ResponseData> = {
  type: 'object',
  properties: {
    message: { type: 'string' },
  },
  required: ['message'],
};

export default async function (app: FastifyInstance, _: FastifyPluginOptions) {
  app.route<{ Body: RequestData; Reply: ResponseData }>({
    method: 'POST',
    url: '/sign-up',
    schema: {
      operationId: 'signUp',
      summary: 'Sign up a new user',
      description: 'Registers a new user and sends a verification email.',
      tags: ['auth'],
      body: bodySchema,
      response: {
        201: responseSchema,
      },
      'x-default-rate-limit': 10,
    },
    handler: async (req, reply) => {
      const { email, password } = req.body;

      await signUpUsecase.execute({ email, password });

      return reply.status(201).send({ message: 'Verification email sent. Please check your inbox.' });
    },
  });
}
