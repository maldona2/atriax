import { getBillingMode } from './billingAccessService.js';

describe('billing access policy', () => {
  const originalManualBillingEmails = process.env.MANUAL_BILLING_EMAILS;

  afterEach(() => {
    if (originalManualBillingEmails === undefined) {
      delete process.env.MANUAL_BILLING_EMAILS;
    } else {
      process.env.MANUAL_BILLING_EMAILS = originalManualBillingEmails;
    }
  });

  it('keeps the legacy account on manual transfers by default', () => {
    delete process.env.MANUAL_BILLING_EMAILS;

    expect(getBillingMode('facundogordillo14@gmail.com')).toBe(
      'manual_transfer'
    );
    expect(getBillingMode('facugordillo14@gmail.com')).toBe('manual_transfer');
    expect(getBillingMode('new-doctor@example.com')).toBe('mercado_pago');
  });

  it('normalizes configured email addresses', () => {
    process.env.MANUAL_BILLING_EMAILS =
      ' Legacy@Example.com , another@example.com ';

    expect(getBillingMode('legacy@example.com')).toBe('manual_transfer');
    expect(getBillingMode('ANOTHER@example.com')).toBe('manual_transfer');
    expect(getBillingMode('facundogordillo14@gmail.com')).toBe(
      'manual_transfer'
    );
    expect(getBillingMode('facugordillo14@gmail.com')).toBe(
      'manual_transfer'
    );
  });
});
