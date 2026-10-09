import { CATEGORIAS } from '../../domain/rules.js';

const uuid = { type: 'string', format: 'uuid' };
const serviceBody = {
  type: 'object',
  additionalProperties: false,
  required: ['nome', 'categoria', 'preco', 'duracaoMinutos', 'capacidade'],
  properties: {
    nome: { type: 'string', minLength: 2, maxLength: 150 },
    descricao: { type: ['string', 'null'], maxLength: 5000 },
    categoria: { type: 'string', enum: CATEGORIAS },
    preco: { type: 'number', minimum: 0, maximum: 99999999.99 },
    duracaoMinutos: { type: 'integer', minimum: 1, maximum: 1440 },
    capacidade: { type: 'integer', minimum: 1 },
    ativo: { type: 'boolean', default: true }
  }
};

export default async function servicoRoutes(fastify, { service }) {
  const { ativo: _ignored, preco: _price, ...updateProperties } = serviceBody.properties;

  fastify.post('/', {
    preHandler: fastify.authorize('ADMIN'),
    schema: { tags: ['Serviços'], summary: 'Cadastra um serviço extra', body: serviceBody }
  }, async (request, reply) => reply.code(201).send(await service.create(request.body)));

  fastify.get('/', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Serviços'],
      summary: 'Lista serviços extras',
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ativo: { type: 'boolean' },
          categoria: { type: 'string', enum: CATEGORIAS },
          nome: { type: 'string', maxLength: 150 }
        }
      }
    }
  }, async (request) => service.list(request.query));

  fastify.get('/:id', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Serviços'], summary: 'Consulta um serviço extra',
      params: { type: 'object', required: ['id'], properties: { id: uuid } }
    }
  }, async (request) => service.findById(request.params.id));

  fastify.put('/:id', {
    preHandler: fastify.authorize('ADMIN'),
    schema: {
      tags: ['Serviços'], summary: 'Atualiza os dados de um serviço',
      params: { type: 'object', required: ['id'], properties: { id: uuid } },
      body: {
        ...serviceBody,
        properties: updateProperties,
        required: ['nome', 'categoria', 'duracaoMinutos', 'capacidade']
      }
    }
  }, async (request) => service.update(request.params.id, request.body));

  fastify.patch('/:id/preco', {
    preHandler: fastify.authorize('ADMIN'),
    schema: {
      tags: ['Serviços'], summary: 'Atualiza o preço de um serviço',
      params: { type: 'object', required: ['id'], properties: { id: uuid } },
      body: {
        type: 'object', additionalProperties: false, required: ['preco'],
        properties: { preco: { type: 'number', minimum: 0, maximum: 99999999.99 } }
      }
    }
  }, async (request) => service.updatePrice(request.params.id, request.body.preco));

  fastify.patch('/:id/situacao', {
    preHandler: fastify.authorize('ADMIN'),
    schema: {
      tags: ['Serviços'], summary: 'Ativa ou inativa um serviço',
      params: { type: 'object', required: ['id'], properties: { id: uuid } },
      body: {
        type: 'object', additionalProperties: false, required: ['ativo'],
        properties: { ativo: { type: 'boolean' } }
      }
    }
  }, async (request) => service.setActive(request.params.id, request.body.ativo));
}
