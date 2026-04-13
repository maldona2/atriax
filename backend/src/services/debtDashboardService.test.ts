import { DebtDashboardService } from './debtDashboardService.js';
import { db } from '../db/client.js';

// Mock the database
jest.mock('../db/client.js', () => ({
  db: {
    select: jest.fn(),
  },
  appointments: {},
  appointmentTreatments: {},
  treatments: {},
}));

describe('DebtDashboardService', () => {
  let service: DebtDashboardService;
  const mockTenantId = 'tenant-123';

  beforeEach(() => {
    service = new DebtDashboardService();
    jest.clearAllMocks();
  });

  describe('calculateTreatmentCosts', () => {
    it('should calculate total treatment costs for paid appointments', async () => {
      // Mock database query result
      const mockResult = { totalCostCents: 15000 };

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([mockResult]),
            }),
          }),
        }),
      });

      const result = await service.calculateTreatmentCosts(mockTenantId);

      expect(result).toBe(15000);
      expect(db.select).toHaveBeenCalled();
    });

    it('should return 0 when no treatments have cost data', async () => {
      // Mock database query result with 0 costs
      const mockResult = { totalCostCents: 0 };

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([mockResult]),
            }),
          }),
        }),
      });

      const result = await service.calculateTreatmentCosts(mockTenantId);

      expect(result).toBe(0);
    });

    it('should filter by date range when provided', async () => {
      const mockResult = { totalCostCents: 5000 };
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([mockResult]),
            }),
          }),
        }),
      });

      const result = await service.calculateTreatmentCosts(
        mockTenantId,
        startDate,
        endDate
      );

      expect(result).toBe(5000);
    });

    it('should handle null result gracefully', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await service.calculateTreatmentCosts(mockTenantId);

      expect(result).toBe(0);
    });
  });

  describe('calculateStatistics', () => {
    it('should calculate statistics with treatment costs', async () => {
      // Mock the database queries
      let selectCallCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        selectCallCount++;

        if (selectCallCount === 1) {
          // First call: paid appointments
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ totalPaidCents: 100000 }]),
            }),
          };
        } else if (selectCallCount === 2) {
          // Second call: unpaid appointments
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ totalUnpaidCents: 20000 }]),
            }),
          };
        } else if (selectCallCount === 3) {
          // Third call: patients with balance
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ count: 5 }]),
            }),
          };
        } else {
          // Fourth call: treatment costs (from calculateTreatmentCosts)
          return {
            from: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnValue({
                innerJoin: jest.fn().mockReturnValue({
                  where: jest
                    .fn()
                    .mockResolvedValue([{ totalCostCents: 30000 }]),
                }),
              }),
            }),
          };
        }
      });

      const result = await service.calculateStatistics(mockTenantId);

      expect(result.totalPaidCents).toBe(100000);
      expect(result.totalUnpaidCents).toBe(20000);
      expect(result.patientsWithBalance).toBe(5);
      expect(result.averageDebtCents).toBe(4000); // 20000 / 5
      expect(result.totalTreatmentCostsCents).toBe(30000);
      expect(result.realIncomeCents).toBe(70000); // 100000 - 30000
      expect(result.profitMarginPercentage).toBe(70); // (70000 / 100000) * 100
      expect(result.collectionRate).toBeCloseTo(83.33, 1); // (100000 / 120000) * 100
    });

    it('should handle zero revenue correctly', async () => {
      let selectCallCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        selectCallCount++;

        if (selectCallCount === 1) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ totalPaidCents: 0 }]),
            }),
          };
        } else if (selectCallCount === 2) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ totalUnpaidCents: 0 }]),
            }),
          };
        } else if (selectCallCount === 3) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ count: 0 }]),
            }),
          };
        } else {
          return {
            from: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnValue({
                innerJoin: jest.fn().mockReturnValue({
                  where: jest.fn().mockResolvedValue([{ totalCostCents: 0 }]),
                }),
              }),
            }),
          };
        }
      });

      const result = await service.calculateStatistics(mockTenantId);

      expect(result.totalPaidCents).toBe(0);
      expect(result.profitMarginPercentage).toBe(0);
      expect(result.realIncomeCents).toBe(0);
      expect(result.collectionRate).toBe(0);
    });

    it('should handle negative profit margin when costs exceed revenue', async () => {
      let selectCallCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        selectCallCount++;

        if (selectCallCount === 1) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ totalPaidCents: 50000 }]),
            }),
          };
        } else if (selectCallCount === 2) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ totalUnpaidCents: 10000 }]),
            }),
          };
        } else if (selectCallCount === 3) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ count: 2 }]),
            }),
          };
        } else {
          return {
            from: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnValue({
                innerJoin: jest.fn().mockReturnValue({
                  where: jest
                    .fn()
                    .mockResolvedValue([{ totalCostCents: 80000 }]),
                }),
              }),
            }),
          };
        }
      });

      const result = await service.calculateStatistics(mockTenantId);

      expect(result.totalPaidCents).toBe(50000);
      expect(result.totalTreatmentCostsCents).toBe(80000);
      expect(result.realIncomeCents).toBe(-30000); // 50000 - 80000
      expect(result.profitMarginPercentage).toBe(-60); // (-30000 / 50000) * 100
    });

    it('should filter by date range when provided', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      let selectCallCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        selectCallCount++;

        if (selectCallCount === 1) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ totalPaidCents: 75000 }]),
            }),
          };
        } else if (selectCallCount === 2) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ totalUnpaidCents: 15000 }]),
            }),
          };
        } else if (selectCallCount === 3) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ count: 3 }]),
            }),
          };
        } else {
          return {
            from: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnValue({
                innerJoin: jest.fn().mockReturnValue({
                  where: jest
                    .fn()
                    .mockResolvedValue([{ totalCostCents: 25000 }]),
                }),
              }),
            }),
          };
        }
      });

      const result = await service.calculateStatistics(
        mockTenantId,
        startDate,
        endDate
      );

      expect(result.totalPaidCents).toBe(75000);
      expect(result.totalTreatmentCostsCents).toBe(25000);
      expect(result.realIncomeCents).toBe(50000);
    });

    it('should calculate average debt correctly', async () => {
      let selectCallCount = 0;
      (db.select as jest.Mock).mockImplementation(() => {
        selectCallCount++;

        if (selectCallCount === 1) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ totalPaidCents: 100000 }]),
            }),
          };
        } else if (selectCallCount === 2) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ totalUnpaidCents: 30000 }]),
            }),
          };
        } else if (selectCallCount === 3) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ count: 6 }]),
            }),
          };
        } else {
          return {
            from: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnValue({
                innerJoin: jest.fn().mockReturnValue({
                  where: jest
                    .fn()
                    .mockResolvedValue([{ totalCostCents: 40000 }]),
                }),
              }),
            }),
          };
        }
      });

      const result = await service.calculateStatistics(mockTenantId);

      expect(result.averageDebtCents).toBe(5000); // 30000 / 6
      expect(result.patientsWithBalance).toBe(6);
    });
  });
});
