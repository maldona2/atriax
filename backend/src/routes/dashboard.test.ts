import request from 'supertest';
import express, { Express } from 'express';
import dashboardRouter from './dashboard.js';
import * as dashboardService from '../services/dashboardService.js';
import { errorHandler } from '../utils/errorHandler.js';

jest.mock('../services/dashboardService.js');

jest.mock('../middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { tenantId: 'test-tenant-id', role: 'professional' };
    next();
  },
}));

jest.mock('../middleware/requireRole.js', () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

describe('Dashboard Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRouter);
    app.use(errorHandler);
    jest.clearAllMocks();
  });

  it('GET /api/dashboard returns aggregated data', async () => {
    (dashboardService.getDashboard as jest.Mock).mockResolvedValue({
      todayAppointments: [],
      cycleAlerts: { upcoming: [], overdue: [] },
      kpis: {
        todayCount: 0,
        confirmedCount: 0,
        pendingCount: 0,
        todayRevenueCents: 0,
      },
      debtSummary: { totalPendingCents: 0, patientCount: 0 },
    });

    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.cycleAlerts).toEqual({ upcoming: [], overdue: [] });
    expect(dashboardService.getDashboard).toHaveBeenCalledWith(
      'test-tenant-id'
    );
  });

  it('POST /api/dashboard/cycle-reminder/:id returns the send result', async () => {
    (dashboardService.sendCycleReminder as jest.Mock).mockResolvedValue({
      status: 'sent',
    });

    const res = await request(app).post(
      '/api/dashboard/cycle-reminder/11111111-1111-1111-1111-111111111111'
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'sent' });
    expect(dashboardService.sendCycleReminder).toHaveBeenCalledWith(
      'test-tenant-id',
      '11111111-1111-1111-1111-111111111111'
    );
  });

  it('POST returns 400 for a non-uuid patientTreatmentId', async () => {
    const res = await request(app).post(
      '/api/dashboard/cycle-reminder/not-a-uuid'
    );
    expect(res.status).toBe(400);
  });

  it('POST surfaces the service status code (e.g. 409 cooldown)', async () => {
    const err = new Error(
      'Ya se envió un recordatorio recientemente'
    ) as Error & {
      statusCode?: number;
    };
    err.statusCode = 409;
    (dashboardService.sendCycleReminder as jest.Mock).mockRejectedValue(err);

    const res = await request(app).post(
      '/api/dashboard/cycle-reminder/11111111-1111-1111-1111-111111111111'
    );
    expect(res.status).toBe(409);
  });
});
