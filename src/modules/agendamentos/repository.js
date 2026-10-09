function mapAgendamento(row) {
  if (!row) return null;
  return {
    id: row.id,
    servicoExtraId: row.servico_extra_id,
    reservaId: row.reserva_id,
    dataAgendamento: row.data_agendamento,
    horaInicio: row.hora_inicio,
    horaFim: row.hora_fim,
    quantidadePessoas: row.quantidade_pessoas,
    status: row.status_codigo,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

export class AgendamentoRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data, connection = this.db) {
    const id = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO agendamento_servico
       (id, servico_extra_id, reserva_id, data_agendamento,
        hora_inicio, hora_fim, quantidade_pessoas, status_codigo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE')`,
      [id, data.servicoExtraId, data.reservaId, data.dataAgendamento,
        data.horaInicio, data.horaFim, data.quantidadePessoas]
    );
    return this.findById(id, connection);
  }

  async findById(id, connection = this.db) {
    const [rows] = await connection.execute(
      'SELECT * FROM agendamento_servico WHERE id = ?',
      [id]
    );
    return mapAgendamento(rows[0]);
  }

  async findByIdForUpdate(id, connection) {
    const [rows] = await connection.execute(
      'SELECT * FROM agendamento_servico WHERE id = ? FOR UPDATE',
      [id]
    );
    return mapAgendamento(rows[0]);
  }

  async list(filters) {
    const where = [];
    const params = [];
    const fields = {
      reservaId: 'reserva_id',
      servicoExtraId: 'servico_extra_id',
      status: 'status_codigo',
      dataAgendamento: 'data_agendamento'
    };
    for (const [key, column] of Object.entries(fields)) {
      if (filters[key]) {
        where.push(`${column} = ?`);
        params.push(filters[key]);
      }
    }
    const [rows] = await this.db.execute(
      `SELECT * FROM agendamento_servico
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY data_agendamento DESC, hora_inicio DESC`,
      params
    );
    return rows.map(mapAgendamento);
  }

  async occupiedPeople(data, connection = this.db, excludeId = null) {
    const params = [data.servicoExtraId, data.dataAgendamento,
      data.horaFim, data.horaInicio];
    let exclusion = '';
    if (excludeId) {
      exclusion = 'AND id <> ?';
      params.push(excludeId);
    }
    const [rows] = await connection.execute(
      `SELECT COALESCE(SUM(quantidade_pessoas), 0) AS ocupadas
       FROM agendamento_servico
       WHERE servico_extra_id = ? AND data_agendamento = ?
         AND status_codigo IN ('PENDENTE', 'CONFIRMADO')
         AND hora_inicio < ? AND hora_fim > ?
         ${exclusion}`,
      params
    );
    return Number(rows[0].ocupadas);
  }

  async updateSchedule(id, data, connection = this.db) {
    await connection.execute(
      `UPDATE agendamento_servico
       SET data_agendamento = ?, hora_inicio = ?, hora_fim = ?, quantidade_pessoas = ?
       WHERE id = ?`,
      [data.dataAgendamento, data.horaInicio, data.horaFim, data.quantidadePessoas, id]
    );
    return this.findById(id, connection);
  }

  async updateStatus(id, status, connection = this.db) {
    await connection.execute(
      'UPDATE agendamento_servico SET status_codigo = ? WHERE id = ?',
      [status, id]
    );
    return this.findById(id, connection);
  }
}
