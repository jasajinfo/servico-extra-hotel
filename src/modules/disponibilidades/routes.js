const uuid = { type: 'string', format: 'uuid' };
const time = { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$' };
const availabilityBody = {
  type: 'object',
  additionalProperties: false,
  required: ['horaInicio', 'horaFim', 'segundaQuinta', 'sextaDomingo'],
  properties: {
    horaInicio: time,
    horaFim: time,
    segundaQuinta: { type: 'boolean' },
    sextaDomingo: { type: 'boolean' }
  }
};

export default async function disponibilidadeRoutes(fastify, { service }) {
  fastify.post('/servicos/:servicoId/disponibilidades', {
    preHandler: fastify.authorize('ADMIN'),
    schema: {
      tags: ['Disponibilidades'], summary: 'Cadastra um período de disponibilidade',
      params: {
        type: 'object', required: ['servicoId'], properties: { servicoId: uuid }
      },
      body: availabilityBody
    }
  }, async (request, reply) => reply.code(201).send(
    await service.create(request.params.servicoId, request.body)
  ));

  fastify.get('/servicos/:servicoId/disponibilidades', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Disponibilidades'], summary: 'Lista períodos de um serviço',
      params: {
        type: 'object', required: ['servicoId'], properties: { servicoId: uuid }
      }
    }
  }, async (request) => service.listByService(request.params.servicoId));

  fastify.put('/disponibilidades/:id', {
    preHandler: fastify.authorize('ADMIN'),
    schema: {
      tags: ['Disponibilidades'], summary: 'Atualiza um período de disponibilidade',
      params: { type: 'object', required: ['id'], properties: { id: uuid } },
      body: availabilityBody
    }
  }, async (request) => service.update(request.params.id, request.body));

  fastify.delete('/disponibilidades/:id', {
    preHandler: fastify.authorize('ADMIN'),
    schema: {
      tags: ['Disponibilidades'], summary: 'Exclui um período de disponibilidade',
      params: { type: 'object', required: ['id'], properties: { id: uuid } }
    }
  }, async (request, reply) => {
    await service.delete(request.params.id);
    return reply.code(204).send();
  });

  fastify.post('/servicos/:servicoId/verificar-disponibilidade', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Disponibilidades'], summary: 'Verifica horário e capacidade disponíveis',
      params: {
        type: 'object', required: ['servicoId'], properties: { servicoId: uuid }
      },
      body: {
        type: 'object', additionalProperties: false,
        required: ['dataAgendamento', 'horaInicio', 'horaFim', 'quantidadePessoas'],
        properties: {
          dataAgendamento: { type: 'string', format: 'date' },
          horaInicio: time,
          horaFim: time,
          quantidadePessoas: { type: 'integer', minimum: 1 }
        }
      }
    }
  }, async (request) => service.check({
    ...request.body,
    servicoExtraId: request.params.servicoId
  }));
}
