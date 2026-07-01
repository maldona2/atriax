import { and, asc, desc, eq } from 'drizzle-orm';
import { db, infraPayments, tenants, users } from '../db/client.js';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Current billing month as 'YYYY-MM' (UTC). */
export function currentBillingMonth(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Throws a 400 error if the month is not a valid 'YYYY-MM' string. */
export function assertValidMonth(month: string): void {
  if (!MONTH_RE.test(month)) {
    const err = new Error('Invalid billing month, expected YYYY-MM');
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
}

export interface PaidMonth {
  billing_month: string;
  paid_at: Date;
}

export interface TenantPaymentSummary {
  tenant_id: string;
  tenant_name: string;
  user_email?: string;
  current_month: string;
  current_month_paid: boolean;
  payments: PaidMonth[];
}

export interface TenantPaymentStatus {
  billing_month: string;
  paid: boolean;
  paid_at: Date | null;
}

/** Paid months for a tenant, most recent first. */
export async function listPaidMonths(tenantId: string): Promise<PaidMonth[]> {
  const rows = await db
    .select({
      billingMonth: infraPayments.billingMonth,
      paidAt: infraPayments.paidAt,
    })
    .from(infraPayments)
    .where(eq(infraPayments.tenantId, tenantId))
    .orderBy(desc(infraPayments.billingMonth));

  return rows.map((r) => ({
    billing_month: r.billingMonth,
    paid_at: r.paidAt,
  }));
}

/** Admin overview: every tenant with its current-month status and history. */
export async function listPaymentsOverview(): Promise<TenantPaymentSummary[]> {
  const month = currentBillingMonth();

  const tenantRows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      userEmail: users.email,
    })
    .from(tenants)
    .leftJoin(
      users,
      and(eq(users.tenantId, tenants.id), eq(users.role, 'professional'))
    )
    .orderBy(asc(tenants.name));

  const summaries: TenantPaymentSummary[] = [];
  for (const t of tenantRows) {
    const payments = await listPaidMonths(t.id);
    summaries.push({
      tenant_id: t.id,
      tenant_name: t.name,
      user_email: t.userEmail ?? undefined,
      current_month: month,
      current_month_paid: payments.some((p) => p.billing_month === month),
      payments,
    });
  }
  return summaries;
}

/** Current-month status for a single tenant (client-facing). */
export async function getTenantStatus(
  tenantId: string
): Promise<TenantPaymentStatus> {
  const month = currentBillingMonth();
  const [row] = await db
    .select({ paidAt: infraPayments.paidAt })
    .from(infraPayments)
    .where(
      and(
        eq(infraPayments.tenantId, tenantId),
        eq(infraPayments.billingMonth, month)
      )
    )
    .limit(1);

  return {
    billing_month: month,
    paid: Boolean(row),
    paid_at: row?.paidAt ?? null,
  };
}

/** Mark a month as paid. Idempotent — returns the existing record if present. */
export async function markPaid(
  tenantId: string,
  billingMonth: string,
  paidBy: string | null
): Promise<PaidMonth> {
  assertValidMonth(billingMonth);

  const [inserted] = await db
    .insert(infraPayments)
    .values({ tenantId, billingMonth, paidBy })
    .onConflictDoNothing({
      target: [infraPayments.tenantId, infraPayments.billingMonth],
    })
    .returning({
      billingMonth: infraPayments.billingMonth,
      paidAt: infraPayments.paidAt,
    });

  if (inserted) {
    return { billing_month: inserted.billingMonth, paid_at: inserted.paidAt };
  }

  // Already existed — fetch it.
  const [existing] = await db
    .select({
      billingMonth: infraPayments.billingMonth,
      paidAt: infraPayments.paidAt,
    })
    .from(infraPayments)
    .where(
      and(
        eq(infraPayments.tenantId, tenantId),
        eq(infraPayments.billingMonth, billingMonth)
      )
    )
    .limit(1);

  return { billing_month: existing.billingMonth, paid_at: existing.paidAt };
}

/** Un-mark a month (delete the record). Returns true if a row was removed. */
export async function unmarkPaid(
  tenantId: string,
  billingMonth: string
): Promise<boolean> {
  assertValidMonth(billingMonth);
  const result = await db
    .delete(infraPayments)
    .where(
      and(
        eq(infraPayments.tenantId, tenantId),
        eq(infraPayments.billingMonth, billingMonth)
      )
    );
  return (result.rowCount ?? 0) > 0;
}
