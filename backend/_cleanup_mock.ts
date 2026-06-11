// Remove all mock cycle-test data:  npx tsx _cleanup_mock.ts
import dotenv from 'dotenv'; dotenv.config();
import { eq, and } from 'drizzle-orm';
import { db, patients, treatments } from './src/db/client.js';
import pool from './src/db/connect.js';
const TENANT = '3685c40a-8272-431c-b10c-f00e44402c8a';
const MARK = 'MOCK_CYCLE_TEST';
(async () => {
  // patients cascade-delete their patient_treatments + appointments (FK onDelete cascade)
  const p = await db.delete(patients).where(and(eq(patients.tenantId, TENANT), eq(patients.notes, MARK))).returning({ id: patients.id });
  const t = await db.delete(treatments).where(and(eq(treatments.tenantId, TENANT), eq(treatments.protocolNotes, MARK))).returning({ id: treatments.id });
  console.log(`Removed ${p.length} mock patients (+cascaded treatments/appts) and ${t.length} mock treatments.`);
  await pool.end();
})();
