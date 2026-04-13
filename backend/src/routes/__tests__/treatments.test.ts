import request from 'supertest';
import express, { Express } from 'express';
import treatmentRoutes from '../treatments.js';
import * as treatmentService from '../../services/treatmentService.js';

jest.mock('../../services/treatmentService.js');
jest.mock('../../middleware/auth.js', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { tenantId: 'test-tenant-id', role: 'professional' };
    next();
  },
}));
jest.mock('../../middleware/requireRole.js', () => ({
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

describe('Treatment Routes - Cost Validation', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    app.use('/treatments', treatmentRoutes);

    // Error handler
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(err.statusCode || 500).json({ error: err.message });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /treatments - Create with cost_cents', () => {
    it('should create treatment with valid cost_cents', async () => {
      const mockTreatment = {
        id: '123',
        tenant_id: 'test-tenant-id',
        name: 'Test Treatment',
        price_cents: 10000,
        cost_cents: 5000,
        initial_frequency_weeks: null,
        initial_sessions_count: null,
        maintenance_frequency_weeks: null,
        protocol_notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (treatmentService.create as jest.Mock).mockResolvedValue(mockTreatment);

      const response = await request(app).post('/treatments').send({
        name: 'Test Treatment',
        price_cents: 10000,
        cost_cents: 5000,
      });

      expect(response.status).toBe(201);
      expect(response.body.cost_cents).toBe(5000);
      expect(treatmentService.create).toHaveBeenCalledWith('test-tenant-id', {
        name: 'Test Treatment',
        price_cents: 10000,
        cost_cents: 5000,
      });
    });

    it('should create treatment with null cost_cents', async () => {
      const mockTreatment = {
        id: '123',
        tenant_id: 'test-tenant-id',
        name: 'Test Treatment',
        price_cents: 10000,
        cost_cents: null,
        initial_frequency_weeks: null,
        initial_sessions_count: null,
        maintenance_frequency_weeks: null,
        protocol_notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (treatmentService.create as jest.Mock).mockResolvedValue(mockTreatment);

      const response = await request(app).post('/treatments').send({
        name: 'Test Treatment',
        price_cents: 10000,
        cost_cents: null,
      });

      expect(response.status).toBe(201);
      expect(response.body.cost_cents).toBeNull();
    });

    it('should create treatment without cost_cents field', async () => {
      const mockTreatment = {
        id: '123',
        tenant_id: 'test-tenant-id',
        name: 'Test Treatment',
        price_cents: 10000,
        cost_cents: null,
        initial_frequency_weeks: null,
        initial_sessions_count: null,
        maintenance_frequency_weeks: null,
        protocol_notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (treatmentService.create as jest.Mock).mockResolvedValue(mockTreatment);

      const response = await request(app).post('/treatments').send({
        name: 'Test Treatment',
        price_cents: 10000,
      });

      expect(response.status).toBe(201);
    });

    it('should reject negative cost_cents with Spanish error message', async () => {
      const response = await request(app).post('/treatments').send({
        name: 'Test Treatment',
        price_cents: 10000,
        cost_cents: -100,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'El costo debe ser un número no negativo'
      );
    });

    it('should reject non-integer cost_cents', async () => {
      const response = await request(app).post('/treatments').send({
        name: 'Test Treatment',
        price_cents: 10000,
        cost_cents: 50.5,
      });

      expect(response.status).toBe(400);
    });

    it('should accept zero cost_cents', async () => {
      const mockTreatment = {
        id: '123',
        tenant_id: 'test-tenant-id',
        name: 'Test Treatment',
        price_cents: 10000,
        cost_cents: 0,
        initial_frequency_weeks: null,
        initial_sessions_count: null,
        maintenance_frequency_weeks: null,
        protocol_notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (treatmentService.create as jest.Mock).mockResolvedValue(mockTreatment);

      const response = await request(app).post('/treatments').send({
        name: 'Test Treatment',
        price_cents: 10000,
        cost_cents: 0,
      });

      expect(response.status).toBe(201);
      expect(response.body.cost_cents).toBe(0);
    });
  });

  describe('PUT /treatments/:id - Update with cost_cents', () => {
    it('should update treatment with valid cost_cents', async () => {
      const mockTreatment = {
        id: '123',
        tenant_id: 'test-tenant-id',
        name: 'Updated Treatment',
        price_cents: 15000,
        cost_cents: 7500,
        initial_frequency_weeks: null,
        initial_sessions_count: null,
        maintenance_frequency_weeks: null,
        protocol_notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (treatmentService.update as jest.Mock).mockResolvedValue(mockTreatment);

      const response = await request(app).put('/treatments/123').send({
        cost_cents: 7500,
      });

      expect(response.status).toBe(200);
      expect(response.body.cost_cents).toBe(7500);
      expect(treatmentService.update).toHaveBeenCalledWith(
        'test-tenant-id',
        '123',
        {
          cost_cents: 7500,
        }
      );
    });

    it('should update treatment to null cost_cents', async () => {
      const mockTreatment = {
        id: '123',
        tenant_id: 'test-tenant-id',
        name: 'Updated Treatment',
        price_cents: 15000,
        cost_cents: null,
        initial_frequency_weeks: null,
        initial_sessions_count: null,
        maintenance_frequency_weeks: null,
        protocol_notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (treatmentService.update as jest.Mock).mockResolvedValue(mockTreatment);

      const response = await request(app).put('/treatments/123').send({
        cost_cents: null,
      });

      expect(response.status).toBe(200);
      expect(response.body.cost_cents).toBeNull();
    });

    it('should reject negative cost_cents with Spanish error message', async () => {
      const response = await request(app).put('/treatments/123').send({
        cost_cents: -500,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'El costo debe ser un número no negativo'
      );
    });

    it('should reject non-integer cost_cents', async () => {
      const response = await request(app).put('/treatments/123').send({
        cost_cents: 123.45,
      });

      expect(response.status).toBe(400);
    });
  });
});
