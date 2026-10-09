import 'dotenv/config';

function integer(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Variável ${name} deve ser um inteiro positivo`);
  }
  return value;
}

function boolean(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function authUsers() {
  const fallback = '[{"id":"1","username":"admin","password":"admin123","role":"ADMIN"}]';
  try {
    return JSON.parse(process.env.AUTH_USERS_JSON ?? fallback);
  } catch {
    throw new Error('AUTH_USERS_JSON deve conter um JSON válido');
  }
}

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '0.0.0.0',
  port: integer('PORT', 3000),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: integer('DB_PORT', 3306),
    user: process.env.DB_USER ?? 'hotel_app',
    password: process.env.DB_PASSWORD ?? 'hotel_app_password',
    database: process.env.DB_NAME ?? 'servicos_extras_db',
    connectionLimit: integer('DB_CONNECTION_LIMIT', 10)
  },
  jwtSecret: process.env.JWT_SECRET ?? 'chave-local-insegura-altere-em-producao-123456',
  authUsers: authUsers(),
  reservaValidationEnabled: boolean('RESERVA_VALIDATION_ENABLED', false),
  reservaServiceUrl: process.env.RESERVA_SERVICE_URL ?? 'http://localhost:3001/api/v1',
  reservaRequestTimeoutMs: integer('RESERVA_REQUEST_TIMEOUT_MS', 3000)
});
