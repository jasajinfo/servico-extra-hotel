import { STATUS } from '../../domain/rules.js';

const uuid = { type: 'string', format: 'uuid' };
const time = { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$' };
const scheduleFields = {
  dataAgendamento: { type: 'string', format: 'date' },
  horaInicio: time,
  quantidadePessoas: { type: 'integer', minimum: 1 }
};

export default async function agendamentoRoutes(fastify, { service }) {
  fastify.post('/', {
    preHandler: fastify.authorize('ADMIN', 'RECEPCAO', 'HOSPEDE'),
    schema: {
      tags: ['Agendamentos'], summary: 'Agenda um serviço extra',
      description: 'O horário final é calculado com base na duração do serviço.',
      body: {
        type: 'object', additionalProperties: false,
        required: ['servicoExtraId', 'reservaId', ...Object.keys(scheduleFields)],
        properties: { servicoExtraId: uuid, reservaId: uuid, ...scheduleFields }
      }
    }
  }, async (request, reply) => reply.code(201).send(
    await service.create(request.body, request.headers.authorization)
  ));

  fastify.get('/', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Agendamentos'], summary: 'Lista e filtra agendamentos',
      querystring: {
        type: 'object', additionalProperties: false,
        properties: {
          reservaId: uuid,
          servicoExtraId: uuid,
          status: { type: 'string', enum: STATUS },
          dataAgendamento: { type: 'string', format: 'date' }
        }
      }
    }
  }, async (request) => service.list(request.query));

  fastify.get('/:id', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Agendamentos'], summary: 'Consulta um agendamento',
      params: { type: 'object', required: ['id'], properties: { id: uuid } }
    }
  }, async (request) => service.findById(request.params.id));

  fastify.put('/:id', {
    preHandler: fastify.authorize('ADMIN', 'RECEPCAO', 'HOSPEDE'),
    schema: {
      tags: ['Agendamentos'], summary: 'Altera um agendamento pendente',
      params: { type: 'object', required: ['id'], properties: { id: uuid } },
      body: {
        type: 'object', additionalProperties: false,
        required: Object.keys(scheduleFields), properties: scheduleFields
      }
    }
  }, async (request) => service.update(request.params.id, request.body));

  for (const action of [
    { path: 'confirmar', status: 'CONFIRMADO', roles: ['ADMIN', 'RECEPCAO'] },
    { path: 'cancelar', status: 'CANCELADO', roles: ['ADMIN', 'RECEPCAO', 'HOSPEDE'] },
    { path: 'concluir', status: 'CONCLUIDO', roles: ['ADMIN', 'RECEPCAO'] }
  ]) {
    fastify.patch(`/:id/${action.path}`, {
      preHandler: fastify.authorize(...action.roles),
      schema: {
        tags: ['Agendamentos'],
        summary: `${action.path[0].toUpperCase()}${action.path.slice(1)} um agendamento`,
        params: { type: 'object', required: ['id'], properties: { id: uuid } }
      }
    }, async (request) => service.changeStatus(request.params.id, action.status));
  }
}
