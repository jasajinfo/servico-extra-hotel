import fp from 'fastify-plugin';
import mysql from 'mysql2/promise';
import { config } from '../config.js';

async function dbPlugin(fastify) {
  const pool = mysql.createPool({
    ...config.db,
    waitForConnections: true,
    queueLimit: 0,
    timezone: 'Z',
    decimalNumbers: true,
    dateStrings: true
  });

  fastify.decorate('db', pool);
  fastify.addHook('onClose', async () => pool.end());
}

export default fp(dbPlugin, { name: 'db' });
