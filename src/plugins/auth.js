import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { AppError } from '../errors.js';
import { config } from '../config.js';

async function authPlugin(fastify) {
  await fastify.register(jwt, { secret: config.jwtSecret });

  fastify.decorate('authenticate', async function authenticate(request) {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError('Token ausente ou inválido', 401, 'UNAUTHORIZED');
    }
  });

  fastify.decorate('authorize', function authorize(...roles) {
    return async function authorizationHook(request) {
      await fastify.authenticate(request);
      if (!roles.includes(request.user.role)) {
        throw new AppError('Usuário sem permissão para esta operação', 403, 'FORBIDDEN');
      }
    };
  });
}

export default fp(authPlugin, { name: 'auth' });
