import dotenv from 'dotenv';
import pg from 'pg';
import logger from '../utils/logger.js';

// Load environment variables if not already loaded
if (!process.env.DATABASE_URL) {
  dotenv.config();
}

const { Pool } = pg;

/**
 * Whether to open the connection over SSL.
 *
 * Railway's managed Postgres requires SSL, so production defaults to it.
 * Self-hosted Postgres reached over a private network (Coolify) runs with
 * ssl=off and rejects the handshake outright, so DATABASE_SSL overrides the
 * default in either direction.
 */
export function shouldUseSsl(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.DATABASE_SSL !== undefined) {
    return env.DATABASE_SSL === 'true';
  }
  return env.NODE_ENV === 'production';
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  logger.info('Database connected');
});

pool.on('error', (err) => {
  logger.error({ err }, 'Database connection error');
});

export default pool;
