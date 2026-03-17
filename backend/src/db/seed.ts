import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { eq, and, sql } from 'drizzle-orm';
import { db, users, modelPricing } from './client.js';
import pool from './connect.js';
import logger from '../utils/logger.js';

const SALT_ROUNDS = 10;

async function seedSuperAdmin() {
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
}

async function seedModelPricing() {
  // Check if model pricing data already exists
  const existingPricing = await db
    .select({ id: modelPricing.id })
    .from(modelPricing)
    .limit(1);

  if (existingPricing.length > 0) {
    logger.info('Model pricing data already exists, skipping seed.');
    return;
  }

  // OpenAI model pricing as of 2024 (prices per 1000 tokens in USD)
  // Stored as strings for precision
  const pricingData = [
    {
      modelName: 'gpt-4',
      inputTokenPriceUsd: '0.03',
      outputTokenPriceUsd: '0.06',
      effectiveDate: new Date('2024-01-01'),
    },
    {
      modelName: 'gpt-4-turbo',
      inputTokenPriceUsd: '0.01',
      outputTokenPriceUsd: '0.03',
      effectiveDate: new Date('2024-01-01'),
    },
    {
      modelName: 'gpt-4-turbo-preview',
      inputTokenPriceUsd: '0.01',
      outputTokenPriceUsd: '0.03',
      effectiveDate: new Date('2024-01-01'),
    },
    {
      modelName: 'gpt-3.5-turbo',
      inputTokenPriceUsd: '0.0005',
      outputTokenPriceUsd: '0.0015',
      effectiveDate: new Date('2024-01-01'),
    },
    {
      modelName: 'gpt-3.5-turbo-16k',
      inputTokenPriceUsd: '0.003',
      outputTokenPriceUsd: '0.004',
      effectiveDate: new Date('2024-01-01'),
    },
  ];

  await db.insert(modelPricing).values(pricingData);

  logger.info(`Seeded ${pricingData.length} model pricing records.`);
}

async function seed() {
  await seedSuperAdmin();
  await seedModelPricing();
  await pool.end();
}

seed().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
