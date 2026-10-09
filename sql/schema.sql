CREATE DATABASE IF NOT EXISTS servicos_extras_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

USE servicos_extras_db;

CREATE TABLE IF NOT EXISTS categoria_servico (
  codigo VARCHAR(20) NOT NULL,
  descricao VARCHAR(100) NOT NULL,
  PRIMARY KEY (codigo),
  UNIQUE KEY uk_categoria_servico_descricao (descricao)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS status_agendamento (
  codigo VARCHAR(20) NOT NULL,
  descricao VARCHAR(100) NOT NULL,
  PRIMARY KEY (codigo),
  UNIQUE KEY uk_status_agendamento_descricao (descricao)
) ENGINE=InnoDB;

INSERT INTO categoria_servico (codigo, descricao) VALUES
  ('SPA', 'Spa'), ('PASSEIO', 'Passeio'), ('REFEICAO', 'Refeição')
ON DUPLICATE KEY UPDATE descricao = VALUES(descricao);

INSERT INTO status_agendamento (codigo, descricao) VALUES
  ('PENDENTE', 'Pendente'), ('CONFIRMADO', 'Confirmado'),
  ('CONCLUIDO', 'Concluído'), ('CANCELADO', 'Cancelado')
ON DUPLICATE KEY UPDATE descricao = VALUES(descricao);

CREATE TABLE IF NOT EXISTS servico_extra (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT NULL,
  categoria_codigo VARCHAR(20) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  duracao_minutos INT UNSIGNED NOT NULL,
  capacidade INT UNSIGNED NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT ck_servico_extra_preco CHECK (preco >= 0),
  CONSTRAINT ck_servico_extra_duracao CHECK (duracao_minutos > 0),
  CONSTRAINT ck_servico_extra_capacidade CHECK (capacidade > 0),
  CONSTRAINT fk_servico_extra_categoria FOREIGN KEY (categoria_codigo)
    REFERENCES categoria_servico (codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
  KEY idx_servico_extra_nome (nome),
  KEY idx_servico_extra_categoria (categoria_codigo),
  KEY idx_servico_extra_ativo (ativo),
  KEY idx_servico_extra_categoria_ativo (categoria_codigo, ativo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS disponibilidade_servico (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  servico_extra_id CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  sexta_domingo BOOLEAN NOT NULL DEFAULT FALSE,
  segunda_quinta BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT ck_disponibilidade_periodo CHECK (hora_fim > hora_inicio),
  CONSTRAINT ck_disponibilidade_dias CHECK (sexta_domingo = TRUE OR segunda_quinta = TRUE),
  CONSTRAINT fk_disponibilidade_servico FOREIGN KEY (servico_extra_id)
    REFERENCES servico_extra (id) ON UPDATE CASCADE ON DELETE CASCADE,
  KEY idx_disponibilidade_servico (servico_extra_id),
  KEY idx_disponibilidade_servico_horario (servico_extra_id, hora_inicio, hora_fim),
  KEY idx_disponibilidade_dias (segunda_quinta, sexta_domingo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agendamento_servico (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  servico_extra_id CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  reserva_id CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  data_agendamento DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  quantidade_pessoas INT UNSIGNED NOT NULL,
  status_codigo VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT ck_agendamento_periodo CHECK (hora_fim > hora_inicio),
  CONSTRAINT ck_agendamento_quantidade CHECK (quantidade_pessoas > 0),
  CONSTRAINT fk_agendamento_servico FOREIGN KEY (servico_extra_id)
    REFERENCES servico_extra (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_agendamento_status FOREIGN KEY (status_codigo)
    REFERENCES status_agendamento (codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
  KEY idx_agendamento_servico (servico_extra_id),
  KEY idx_agendamento_reserva (reserva_id),
  KEY idx_agendamento_status (status_codigo),
  KEY idx_agendamento_data (data_agendamento),
  KEY idx_agendamento_servico_data (servico_extra_id, data_agendamento),
  KEY idx_agendamento_disponibilidade
    (servico_extra_id, data_agendamento, hora_inicio, hora_fim),
  KEY idx_agendamento_reserva_status (reserva_id, status_codigo)
) ENGINE=InnoDB;

DROP TRIGGER IF EXISTS bi_servico_extra_uuid;
DELIMITER $$
CREATE TRIGGER bi_servico_extra_uuid BEFORE INSERT ON servico_extra
FOR EACH ROW BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN SET NEW.id = UUID(); END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS bi_disponibilidade_servico_uuid;
DELIMITER $$
CREATE TRIGGER bi_disponibilidade_servico_uuid BEFORE INSERT ON disponibilidade_servico
FOR EACH ROW BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN SET NEW.id = UUID(); END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS bi_agendamento_servico_uuid;
DELIMITER $$
CREATE TRIGGER bi_agendamento_servico_uuid BEFORE INSERT ON agendamento_servico
FOR EACH ROW BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN SET NEW.id = UUID(); END IF;
END$$
DELIMITER ;
