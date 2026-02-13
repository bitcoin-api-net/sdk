import type { CookieSerializeOptions } from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import env, { required } from '../env.js';
import { UnauthorizedError } from '../errors.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      email: string;
      type: 'access' | 'refresh';
    };
    user: {
      email: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyReply {
    setAccessCookie: (token: string, options?: Partial<CookieSerializeOptions>) => FastifyReply;
    setRefreshCookie: (token: string, options?: Partial<CookieSerializeOptions>) => FastifyReply;
    clearAuthCookie: () => FastifyReply;
  }
  interface FastifyContextConfig {
    auth?: boolean | 'optional';
  }
}

export function registerJwtPlugin(fastify: FastifyInstance) {
  fastify.register(fastifyJwt as any, {
    secret: env.SECRET_KEY,
    cookie: {
      cookieName: 'access',
      signed: false,
    },
  });

  const defaultCookieOptions: CookieSerializeOptions = {
    httpOnly: true,
    path: '/',
    // Lax нужен, чтобы куки отправлялись при OAuth-редиректах с внешних доменов (Discord, Google и т.п.)
    sameSite: 'lax',
    secure: required(env.NODE_ENV) === 'production',
    maxAge: 60 * 60 * 2,
  };

  fastify.decorateReply('setAccessCookie', function (this: FastifyReply, token: string, options = {}) {
    const opts = { ...defaultCookieOptions, ...options };
    this.setCookie('access', token, opts);
    return this;
  });

  fastify.decorateReply('setRefreshCookie', function (this: FastifyReply, token: string, options = {}) {
    const opts = { ...defaultCookieOptions, maxAge: 60 * 60 * 24 * 14, ...options };
    this.setCookie('refresh', token, opts);
    return this;
  });

  fastify.decorateReply('clearAuthCookie', function (this: FastifyReply) {
    this.clearCookie('access', { path: '/' });
    this.clearCookie('refresh', { path: '/' });
    return this;
  });

  fastify.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const authConfig = req.routeOptions.config?.auth;
    if (!authConfig) return;

    const accessToken = req.cookies?.access;
    const refreshToken = req.cookies?.refresh;

    if (accessToken) {
      try {
        await req.jwtVerify();
        return;
      } catch {}
    }

    if (refreshToken) {
      try {
        const decoded = fastify.jwt.verify<{ email: string; type: 'refresh' }>(refreshToken);
        const newAccessToken = fastify.jwt.sign({ email: decoded.email, type: 'access' }, { expiresIn: '2h' });

        reply.setAccessCookie(newAccessToken);
        req.user = { email: decoded.email };
        return;
      } catch {
        reply.clearAuthCookie();
        if (authConfig === 'optional') return;
        throw new UnauthorizedError('Session expired', 'UNAUTHORIZED');
      }
    }

    if (authConfig === 'optional') {
      return;
    }

    throw new UnauthorizedError('Unauthorized', 'UNAUTHORIZED');
  });
}
