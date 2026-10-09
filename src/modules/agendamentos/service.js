import { AppError, conflict, notFound } from '../../errors.js';
import {
  addMinutesToTime,
  assertStatusTransition,
  dayGroup,
  normalizeTime
} from '../../domain/rules.js';

export class AgendamentoService {
  constructor(db, repositories, reservaClient) {
    this.db = db;
    this.agendamentoRepository = repositories.agendamento;
    this.servicoRepository = repositories.servico;
    this.disponibilidadeRepository = repositories.disponibilidade;
    this.reservaClient = reservaClient;
  }

  async validateCapacity(connection, servico, data, excludeId = null) {
    if (!servico.ativo) throw conflict('O serviço extra está inativo');
    if (data.quantidadePessoas > servico.capacidade) {
      throw conflict('A quantidade de pessoas ultrapassa a capacidade do serviço');
    }

    const periodo = await this.disponibilidadeRepository.findMatching(
      servico.id,
      dayGroup(data.dataAgendamento),
      data.horaInicio,
      data.horaFim,
      connection
    );
    if (!periodo) throw conflict('O horário solicitado não está disponível para o serviço');

    const ocupadas = await this.agendamentoRepository.occupiedPeople(
      { ...data, servicoExtraId: servico.id },
      connection,
      excludeId
    );
    if (ocupadas + data.quantidadePessoas > servico.capacidade) {
      throw conflict(`Capacidade insuficiente. Restam ${Math.max(0, servico.capacidade - ocupadas)} vaga(s)`);
    }
  }

  async create(data, authorization) {
    await this.reservaClient.validate(data.reservaId, authorization);
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      const servico = await this.servicoRepository.findByIdForUpdate(
        data.servicoExtraId,
        connection
      );
      if (!servico) throw notFound('Serviço extra');

      const schedule = {
        ...data,
        horaInicio: normalizeTime(data.horaInicio),
        horaFim: addMinutesToTime(data.horaInicio, servico.duracaoMinutos)
      };
      await this.validateCapacity(connection, servico, schedule);
      const created = await this.agendamentoRepository.create(schedule, connection);
      await connection.commit();
      return created;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findById(id) {
    const agendamento = await this.agendamentoRepository.findById(id);
    if (!agendamento) throw notFound('Agendamento');
    return agendamento;
  }

  async list(filters) {
    return this.agendamentoRepository.list(filters);
  }

  async update(id, data) {
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      const agendamento = await this.agendamentoRepository.findByIdForUpdate(id, connection);
      if (!agendamento) throw notFound('Agendamento');
      if (agendamento.status !== 'PENDENTE') {
        throw conflict('Somente agendamentos pendentes podem ser alterados');
      }

      const servico = await this.servicoRepository.findByIdForUpdate(
        agendamento.servicoExtraId,
        connection
      );
      const schedule = {
        ...data,
        servicoExtraId: servico.id,
        horaInicio: normalizeTime(data.horaInicio),
        horaFim: addMinutesToTime(data.horaInicio, servico.duracaoMinutos)
      };
      await this.validateCapacity(connection, servico, schedule, id);
      const updated = await this.agendamentoRepository.updateSchedule(id, schedule, connection);
      await connection.commit();
      return updated;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async changeStatus(id, nextStatus) {
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      const agendamento = await this.agendamentoRepository.findByIdForUpdate(id, connection);
      if (!agendamento) throw notFound('Agendamento');
      assertStatusTransition(agendamento.status, nextStatus);
      const updated = await this.agendamentoRepository.updateStatus(id, nextStatus, connection);
      await connection.commit();
      return updated;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
