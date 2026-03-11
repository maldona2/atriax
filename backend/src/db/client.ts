import { drizzle } from 'drizzle-orm/node-postgres';
import pool from './connect.js';
import * as schema from './schema.js';

export const db = drizzle(pool, { schema });
export * from './schema.js';
