function mapServico(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    categoria: row.categoria_codigo,
    preco: Number(row.preco),
    duracaoMinutos: row.duracao_minutos,
    capacidade: row.capacidade,
    ativo: Boolean(row.ativo),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

export class ServicoRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data) {
    const id = crypto.randomUUID();
    await this.db.execute(
      `INSERT INTO servico_extra
       (id, nome, descricao, categoria_codigo, preco, duracao_minutos, capacidade, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.nome, data.descricao ?? null, data.categoria, data.preco,
        data.duracaoMinutos, data.capacidade, data.ativo ?? true]
    );
    return this.findById(id);
  }

  async findById(id, connection = this.db) {
    const [rows] = await connection.execute('SELECT * FROM servico_extra WHERE id = ?', [id]);
    return mapServico(rows[0]);
  }

  async findByIdForUpdate(id, connection) {
    const [rows] = await connection.execute(
      'SELECT * FROM servico_extra WHERE id = ? FOR UPDATE',
      [id]
    );
    return mapServico(rows[0]);
  }

  async list({ ativo, categoria, nome }) {
    const where = [];
    const params = [];
    if (ativo !== undefined) {
      where.push('ativo = ?');
      params.push(ativo);
    }
    if (categoria) {
      where.push('categoria_codigo = ?');
      params.push(categoria);
    }
    if (nome) {
      where.push('nome LIKE ?');
      params.push(`%${nome}%`);
    }
    const sql = `SELECT * FROM servico_extra
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY nome`;
    const [rows] = await this.db.execute(sql, params);
    return rows.map(mapServico);
  }

  async update(id, data) {
    await this.db.execute(
      `UPDATE servico_extra
       SET nome = ?, descricao = ?, categoria_codigo = ?,
           duracao_minutos = ?, capacidade = ?
       WHERE id = ?`,
      [data.nome, data.descricao ?? null, data.categoria,
        data.duracaoMinutos, data.capacidade, id]
    );
    return this.findById(id);
  }

  async updatePrice(id, preco) {
    await this.db.execute('UPDATE servico_extra SET preco = ? WHERE id = ?', [preco, id]);
    return this.findById(id);
  }

  async setActive(id, ativo) {
    await this.db.execute('UPDATE servico_extra SET ativo = ? WHERE id = ?', [ativo, id]);
    return this.findById(id);
  }
}
