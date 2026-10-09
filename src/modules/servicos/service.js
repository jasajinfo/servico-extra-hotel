import { AppError, notFound } from '../../errors.js';

export class ServicoService {
  constructor(repository) {
    this.repository = repository;
  }

  async create(data) {
    return this.repository.create(data);
  }

  async findById(id) {
    const servico = await this.repository.findById(id);
    if (!servico) throw notFound('Serviço extra');
    return servico;
  }

  async list(filters) {
    return this.repository.list(filters);
  }

  async update(id, data) {
    await this.findById(id);
    return this.repository.update(id, data);
  }

  async updatePrice(id, preco) {
    await this.findById(id);
    if (preco < 0) throw new AppError('O preço não pode ser negativo');
    return this.repository.updatePrice(id, preco);
  }

  async setActive(id, ativo) {
    await this.findById(id);
    return this.repository.setActive(id, ativo);
  }
}
