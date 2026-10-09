function mapDisponibilidade(row) {
  if (!row) return null;
  return {
    id: row.id,
    servicoExtraId: row.servico_extra_id,
    horaInicio: row.hora_inicio,
    horaFim: row.hora_fim,
    sextaDomingo: Boolean(row.sexta_domingo),
    segundaQuinta: Boolean(row.segunda_quinta),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

export class DisponibilidadeRepository {
  constructor(db) {
    this.db = db;
  }

  async create(servicoId, data) {
    const id = crypto.randomUUID();
    await this.db.execute(
      `INSERT INTO disponibilidade_servico
       (id, servico_extra_id, hora_inicio, hora_fim, sexta_domingo, segunda_quinta)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, servicoId, data.horaInicio, data.horaFim,
        data.sextaDomingo, data.segundaQuinta]
    );
    return this.findById(id);
  }

  async findById(id) {
    const [rows] = await this.db.execute(
      'SELECT * FROM disponibilidade_servico WHERE id = ?',
      [id]
    );
    return mapDisponibilidade(rows[0]);
  }

  async listByService(servicoId, connection = this.db) {
    const [rows] = await connection.execute(
      `SELECT * FROM disponibilidade_servico
       WHERE servico_extra_id = ? ORDER BY hora_inicio`,
      [servicoId]
    );
    return rows.map(mapDisponibilidade);
  }

  async findMatching(servicoId, group, inicio, fim, connection = this.db) {
    const column = group === 'segundaQuinta' ? 'segunda_quinta' : 'sexta_domingo';
    const [rows] = await connection.execute(
      `SELECT * FROM disponibilidade_servico
       WHERE servico_extra_id = ? AND ${column} = TRUE
         AND hora_inicio <= ? AND hora_fim >= ?
       ORDER BY hora_inicio LIMIT 1`,
      [servicoId, inicio, fim]
    );
    return mapDisponibilidade(rows[0]);
  }

  async update(id, data) {
    await this.db.execute(
      `UPDATE disponibilidade_servico
       SET hora_inicio = ?, hora_fim = ?, sexta_domingo = ?, segunda_quinta = ?
       WHERE id = ?`,
      [data.horaInicio, data.horaFim, data.sextaDomingo, data.segundaQuinta, id]
    );
    return this.findById(id);
  }

  async delete(id) {
    const [result] = await this.db.execute(
      'DELETE FROM disponibilidade_servico WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}
