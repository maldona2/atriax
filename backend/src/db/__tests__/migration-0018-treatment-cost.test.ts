/**
 * Integration test for migration 0018: treatment cost_cents column
 *
 * This test verifies that:
 * 1. The cost_cents column exists in the treatments table
 * 2. The column accepts NULL values
 * 3. The column accepts non-negative integers
 * 4. The CHECK constraint rejects negative values
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../client';
import { treatments } from '../schema';
import { eq, sql } from 'drizzle-orm';

describe('Migration 0018: Treatment Cost Cents', () => {
  let testTenantId: string;
  let createdTreatmentIds: string[] = [];

  beforeAll(async () => {
    // Create a test tenant for our tests
    const [tenant] = await db.execute(sql`
      INSERT INTO tenants (name, slug, is_active)
      VALUES ('Test Tenant', 'test-tenant-' || gen_random_uuid(), true)
      RETURNING id
    `);
    testTenantId = (tenant as any).id;
  });

  afterAll(async () => {
    // Clean up created treatments
    if (createdTreatmentIds.length > 0) {
      await db.delete(treatments).where(sql`id = ANY(${createdTreatmentIds})`);
    }

    // Clean up test tenant
    if (testTenantId) {
      await db.execute(sql`DELETE FROM tenants WHERE id = ${testTenantId}`);
    }
  });

  it('should allow creating treatment with cost_cents', async () => {
    const [treatment] = await db
      .insert(treatments)
      .values({
        tenantId: testTenantId,
        name: 'Treatment with Cost',
        priceCents: 10000,
        costCents: 5000,
      })
      .returning();

    expect(treatment).toBeDefined();
    expect(treatment.costCents).toBe(5000);
    createdTreatmentIds.push(treatment.id);
  });

  it('should allow creating treatment without cost_cents (NULL)', async () => {
    const [treatment] = await db
      .insert(treatments)
      .values({
        tenantId: testTenantId,
        name: 'Treatment without Cost',
        priceCents: 10000,
        costCents: null,
      })
      .returning();

    expect(treatment).toBeDefined();
    expect(treatment.costCents).toBeNull();
    createdTreatmentIds.push(treatment.id);
  });

  it('should allow cost_cents of zero', async () => {
    const [treatment] = await db
      .insert(treatments)
      .values({
        tenantId: testTenantId,
        name: 'Treatment with Zero Cost',
        priceCents: 10000,
        costCents: 0,
      })
      .returning();

    expect(treatment).toBeDefined();
    expect(treatment.costCents).toBe(0);
    createdTreatmentIds.push(treatment.id);
  });

  it('should reject negative cost_cents values', async () => {
    await expect(
      db.insert(treatments).values({
        tenantId: testTenantId,
        name: 'Treatment with Negative Cost',
        priceCents: 10000,
        costCents: -100,
      })
    ).rejects.toThrow(/check constraint/i);
  });

  it('should allow updating cost_cents to a valid value', async () => {
    const [treatment] = await db
      .insert(treatments)
      .values({
        tenantId: testTenantId,
        name: 'Treatment to Update',
        priceCents: 10000,
        costCents: null,
      })
      .returning();

    createdTreatmentIds.push(treatment.id);

    const [updated] = await db
      .update(treatments)
      .set({ costCents: 3000 })
      .where(eq(treatments.id, treatment.id))
      .returning();

    expect(updated.costCents).toBe(3000);
  });

  it('should allow updating cost_cents to NULL', async () => {
    const [treatment] = await db
      .insert(treatments)
      .values({
        tenantId: testTenantId,
        name: 'Treatment to Clear Cost',
        priceCents: 10000,
        costCents: 5000,
      })
      .returning();

    createdTreatmentIds.push(treatment.id);

    const [updated] = await db
      .update(treatments)
      .set({ costCents: null })
      .where(eq(treatments.id, treatment.id))
      .returning();

    expect(updated.costCents).toBeNull();
  });

  it('should reject updating cost_cents to a negative value', async () => {
    const [treatment] = await db
      .insert(treatments)
      .values({
        tenantId: testTenantId,
        name: 'Treatment to Update Negatively',
        priceCents: 10000,
        costCents: 5000,
      })
      .returning();

    createdTreatmentIds.push(treatment.id);

    await expect(
      db
        .update(treatments)
        .set({ costCents: -500 })
        .where(eq(treatments.id, treatment.id))
    ).rejects.toThrow(/check constraint/i);
  });

  it('should verify column metadata', async () => {
    const [columnInfo] = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'treatments' AND column_name = 'cost_cents'
    `);

    expect(columnInfo).toBeDefined();
    expect((columnInfo as any).column_name).toBe('cost_cents');
    expect((columnInfo as any).data_type).toBe('integer');
    expect((columnInfo as any).is_nullable).toBe('YES');
  });

  it('should verify check constraint exists', async () => {
    const [constraintInfo] = await db.execute(sql`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = 'treatments_cost_cents_check'
    `);

    expect(constraintInfo).toBeDefined();
    expect((constraintInfo as any).constraint_name).toBe(
      'treatments_cost_cents_check'
    );
    expect((constraintInfo as any).check_clause).toContain('cost_cents');
    expect((constraintInfo as any).check_clause).toContain('>=');
  });
});
