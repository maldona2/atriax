import request from 'supertest';
import express, { Express } from 'express';
import { requireBillingCurrent } from './requireBillingCurrent.js';
import * as infraPaymentService from '../services/infraPaymentService.js';
import { errorHandler } from '../utils/errorHandler.js';

const mockUser = {
  id: 'user-1',
  tenantId: 'tenant-1',
  role: 'professional',
  email: 'facugordillo14@gmail.com',
};

jest.mock('./auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { ...mockUser };
    next();
  },
}));

jest.mock('../services/infraPaymentService.js', () => ({
  BILLING_DUE_DAY: 10,
  getTenantStatus: jest.fn(),
}));

function buildApp(): Express {
  const app = express();
  app.use('/api', requireBillingCurrent);
  app.get('/api/patients', (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/api/billing/status', (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

function mockStatus(overdue: boolean) {
  (infraPaymentService.getTenantStatus as jest.Mock).mockResolvedValue({
    billing_month: '2026-08',
    paid: !overdue,
    paid_at: null,
    due_day: 10,
    overdue,
  });
}

describe('requireBillingCurrent', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.email = 'facugordillo14@gmail.com';
    app = buildApp();
  });

  it('blocks protected routes with 402 when the month is overdue', async () => {
    mockStatus(true);

    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(402);
    expect(res.body.error.message).toContain('10');
  });

  it('keeps the billing route reachable while locked out', async () => {
    mockStatus(true);

    const res = await request(app)
      .get('/api/billing/status')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(infraPaymentService.getTenantStatus).not.toHaveBeenCalled();
  });

  it('allows protected routes when the month is not overdue', async () => {
    mockStatus(false);

    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
  });

  it('ignores tenants that are not on manual billing', async () => {
    mockUser.email = 'new-doctor@example.com';

    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(infraPaymentService.getTenantStatus).not.toHaveBeenCalled();
  });

  it('lets unauthenticated requests through to the route guards', async () => {
    mockStatus(true);

    const res = await request(app).get('/api/patients');

    expect(res.status).toBe(200);
    expect(infraPaymentService.getTenantStatus).not.toHaveBeenCalled();
  });
});
