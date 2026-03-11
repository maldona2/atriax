import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { eq, and, sql } from 'drizzle-orm';
import { db, users } from './client.js';
import pool from './connect.js';
import logger from '../utils/logger.js';

const SALT_ROUNDS = 10;

async function seed() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    logger.error(
      'Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in .env. ' +
        'Add them to create the initial super-admin account.'
    );
    process.exit(1);
  }

  const emailLower = email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.role, 'super_admin'),
        sql`lower(${users.email}) = ${emailLower}`
      )
    )
    .limit(1);

  if (existing) {
    logger.info(`Super-admin ${email} already exists, skipping seed.`);
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await db.insert(users).values({
    email: emailLower,
    passwordHash,
    fullName: 'Super Admin',
    role: 'super_admin',
    tenantId: null,
  });

  logger.info(`Super-admin ${email} created successfully.`);
  await pool.end();
}

seed().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
