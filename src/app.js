import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import staticFiles from '@fastify/static';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from './config.js';
import { AppError } from './errors.js';
import authPlugin from './plugins/auth.js';
import dbPlugin from './plugins/db.js';
import { ReservaClient } from './integrations/reserva-client.js';
import { ServicoRepository } from './modules/servicos/repository.js';
import { DisponibilidadeRepository } from './modules/disponibilidades/repository.js';
import { AgendamentoRepository } from './modules/agendamentos/repository.js';
import { ServicoService } from './modules/servicos/service.js';
import { DisponibilidadeService } from './modules/disponibilidades/service.js';
import { AgendamentoService } from './modules/agendamentos/service.js';
import servicoRoutes from './modules/servicos/routes.js';
import disponibilidadeRoutes from './modules/disponibilidades/routes.js';
import agendamentoRoutes from './modules/agendamentos/routes.js';

export async function buildApp(options = {}) {
  const app = Fastify({
    logger: options.logger ?? config.nodeEnv !== 'test',
    trustProxy: true
  });

  await app.register(cors, { origin: false });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'API de Serviços Extras do Hotel',
        description: 'Cadastro, disponibilidade e agendamento de serviços extras.',
        version: '1.0.0'
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        }
      },
      security: [{ bearerAuth: [] }]
    }
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  await app.register(staticFiles, {
    root: path.join(path.dirname(fileURLToPath(import.meta.url)), '../public'),
    prefix: '/',
    index: 'index.html'
  });
  await app.register(authPlugin);
  await app.register(dbPlugin);

  app.get('/health', { schema: { tags: ['Infraestrutura'], security: [] } }, async () => ({
    status: 'ok',
    service: 'servicos-extras',
    timestamp: new Date().toISOString()
  }));

  app.post('/api/v1/auth/login', {
    schema: {
      tags: ['Autenticação'], security: [], summary: 'Gera um token para uso local',
      body: {
        type: 'object', additionalProperties: false, required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request) => {
    const user = config.authUsers.find((candidate) =>
      candidate.username === request.body.username && candidate.password === request.body.password
    );
    if (!user) throw new AppError('Usuário ou senha inválidos', 401, 'INVALID_CREDENTIALS');
    return {
      token: app.jwt.sign({ sub: user.id, username: user.username, role: user.role }),
      role: user.role
    };
  });

  const servicoRepository = new ServicoRepository(app.db);
  const disponibilidadeRepository = new DisponibilidadeRepository(app.db);
  const agendamentoRepository = new AgendamentoRepository(app.db);

  const servicoService = new ServicoService(servicoRepository);
  const disponibilidadeService = new DisponibilidadeService(
    disponibilidadeRepository,
    servicoRepository,
    agendamentoRepository
  );
  const agendamentoService = new AgendamentoService(app.db, {
    servico: servicoRepository,
    disponibilidade: disponibilidadeRepository,
    agendamento: agendamentoRepository
  }, new ReservaClient());

  await app.register(servicoRoutes, {
    prefix: '/api/v1/servicos', service: servicoService
  });
  await app.register(disponibilidadeRoutes, {
    prefix: '/api/v1', service: disponibilidadeService
  });
  await app.register(agendamentoRoutes, {
    prefix: '/api/v1/agendamentos', service: agendamentoService
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    if (error.validation) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Dados da requisição inválidos',
        details: error.validation
      });
    }
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
        ...(error.details && { details: error.details })
      });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return reply.code(409).send({ error: 'DUPLICATE', message: 'Registro duplicado' });
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return reply.code(422).send({ error: 'INVALID_REFERENCE', message: 'Referência inválida' });
    }
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor'
    });
  });

  return app;
}
