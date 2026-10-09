import { AppError, notFound } from '../../errors.js';
import {
  addMinutesToTime,
  dayGroup,
  normalizeTime,
  timeToSeconds
} from '../../domain/rules.js';

export class DisponibilidadeService {
  constructor(repository, servicoRepository, agendamentoRepository) {
    this.repository = repository;
    this.servicoRepository = servicoRepository;
    this.agendamentoRepository = agendamentoRepository;
  }

  validate(data) {
    const inicio = normalizeTime(data.horaInicio);
    const fim = normalizeTime(data.horaFim);
    if (timeToSeconds(fim) <= timeToSeconds(inicio)) {
      throw new AppError('A hora final deve ser posterior à hora inicial');
    }
    if (!data.segundaQuinta && !data.sextaDomingo) {
      throw new AppError('Informe ao menos um grupo de dias disponível');
    }
    return { ...data, horaInicio: inicio, horaFim: fim };
  }

  async create(servicoId, data) {
    const servico = await this.servicoRepository.findById(servicoId);
    if (!servico) throw notFound('Serviço extra');
    return this.repository.create(servicoId, this.validate(data));
  }

  async listByService(servicoId) {
    const servico = await this.servicoRepository.findById(servicoId);
    if (!servico) throw notFound('Serviço extra');
    return this.repository.listByService(servicoId);
  }

  async update(id, data) {
    if (!await this.repository.findById(id)) throw notFound('Disponibilidade');
    return this.repository.update(id, this.validate(data));
  }

  async delete(id) {
    if (!await this.repository.delete(id)) throw notFound('Disponibilidade');
  }

  async check(data) {
    const servico = await this.servicoRepository.findById(data.servicoExtraId);
    if (!servico) throw notFound('Serviço extra');
    if (!servico.ativo) {
      return { disponivel: false, motivo: 'SERVICO_INATIVO', capacidadeDisponivel: 0 };
    }

    const inicio = normalizeTime(data.horaInicio);
    const fim = normalizeTime(data.horaFim);
    if (timeToSeconds(fim) <= timeToSeconds(inicio)) {
      throw new AppError('A hora final deve ser posterior à hora inicial');
    }
    const fimCalculado = addMinutesToTime(inicio, servico.duracaoMinutos);
    if (fim !== fimCalculado) {
      throw new AppError(
        `A hora final deve ser ${fimCalculado}, conforme a duração cadastrada do serviço`
      );
    }
    const periodo = await this.repository.findMatching(
      servico.id,
      dayGroup(data.dataAgendamento),
      inicio,
      fim
    );
    if (!periodo) {
      return { disponivel: false, motivo: 'FORA_DA_DISPONIBILIDADE', capacidadeDisponivel: 0 };
    }

    const ocupadas = await this.agendamentoRepository.occupiedPeople({
      servicoExtraId: servico.id,
      dataAgendamento: data.dataAgendamento,
      horaInicio: inicio,
      horaFim: fim
    });
    const capacidadeDisponivel = Math.max(0, servico.capacidade - ocupadas);
    return {
      disponivel: data.quantidadePessoas <= capacidadeDisponivel,
      motivo: data.quantidadePessoas <= capacidadeDisponivel ? null : 'CAPACIDADE_INSUFICIENTE',
      capacidadeTotal: servico.capacidade,
      capacidadeOcupada: ocupadas,
      capacidadeDisponivel
    };
  }
}
