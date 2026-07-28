import { eq } from 'drizzle-orm';
import { db, users } from '../db/client.js';

export type BillingMode = 'manual_transfer' | 'mercado_pago';

const DEFAULT_MANUAL_BILLING_EMAILS = [
  'facundogordillo14@gmail.com',
  'facugordillo14@gmail.com',
];

function getManualBillingEmails(): Set<string> {
  const configuredEmails = process.env.MANUAL_BILLING_EMAILS?.split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set([
    ...DEFAULT_MANUAL_BILLING_EMAILS,
    ...(configuredEmails ?? []),
  ]);
}

export function getBillingMode(email: string): BillingMode {
  return getManualBillingEmails().has(email.trim().toLowerCase())
    ? 'manual_transfer'
    : 'mercado_pago';
}

export async function getUserBillingMode(
  userId: string
): Promise<BillingMode | null> {
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ? getBillingMode(user.email) : null;
}

export async function requireManualBillingUser(userId: string): Promise<void> {
  const billingMode = await getUserBillingMode(userId);
  if (billingMode !== 'manual_transfer') {
    const error = new Error('Manual billing is not available for this account');
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }
}
