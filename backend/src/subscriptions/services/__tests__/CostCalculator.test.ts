/**
 * Unit tests for CostCalculator
 *
 * Tests Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { CostCalculator } from '../CostCalculator.js';
import { db, modelPricing } from '../../../db/client.js';

describe('CostCalculator', () => {
  let calculator: CostCalculator;

  beforeEach(async () => {
    calculator = new CostCalculator();
    await calculator.loadPricingFromDatabase();
  });

  describe('loadPricingFromDatabase', () => {
    it('should load pricing data from database', async () => {
      const freshCalculator = new CostCalculator();
      expect(freshCalculator.isInitialized()).toBe(false);

      await freshCalculator.loadPricingFromDatabase();

      expect(freshCalculator.isInitialized()).toBe(true);
    });

    it('should populate pricing table with all models from database', async () => {
      const allPricing = await db.select().from(modelPricing);

      for (const pricing of allPricing) {
        const modelPricing = calculator.getPricing(pricing.modelName);
        expect(modelPricing).toBeDefined();
        expect(modelPricing?.model).toBe(pricing.modelName);
      }
    });
  });

  describe('getPricing', () => {
    it('should return pricing for valid model names', () => {
      const gpt4Pricing = calculator.getPricing('gpt-4');

      expect(gpt4Pricing).toBeDefined();
      expect(gpt4Pricing?.model).toBe('gpt-4');
      expect(gpt4Pricing?.inputTokenPriceUSD).toBe(0.03);
      expect(gpt4Pricing?.outputTokenPriceUSD).toBe(0.06);
    });

    it('should return pricing for gpt-3.5-turbo', () => {
      const gpt35Pricing = calculator.getPricing('gpt-3.5-turbo');

      expect(gpt35Pricing).toBeDefined();
      expect(gpt35Pricing?.model).toBe('gpt-3.5-turbo');
      expect(gpt35Pricing?.inputTokenPriceUSD).toBe(0.0005);
      expect(gpt35Pricing?.outputTokenPriceUSD).toBe(0.0015);
    });

    it('should return null for invalid model names', () => {
      const invalidPricing = calculator.getPricing('invalid-model');

      expect(invalidPricing).toBeNull();
    });
  });

  describe('calculateCost', () => {
    it('should throw error if calculator not initialized', () => {
      const uninitializedCalculator = new CostCalculator();

      expect(() => {
        uninitializedCalculator.calculateCost('gpt-4', 1000, 500);
      }).toThrow('CostCalculator not initialized');
    });

    it('should throw error for unknown model', () => {
      expect(() => {
        calculator.calculateCost('unknown-model', 1000, 500);
      }).toThrow('Pricing not found for model: unknown-model');
    });

    it('should calculate cost correctly for gpt-4', () => {
      // gpt-4: input $0.03/1k tokens, output $0.06/1k tokens
      const result = calculator.calculateCost('gpt-4', 1000, 500);

      expect(result.inputCost).toBe(0.03); // 1000 tokens * $0.03/1000
      expect(result.outputCost).toBe(0.03); // 500 tokens * $0.06/1000
      expect(result.totalCost).toBe(0.06);
    });

    it('should calculate cost correctly for gpt-3.5-turbo', () => {
      // gpt-3.5-turbo: input $0.0005/1k tokens, output $0.0015/1k tokens
      const result = calculator.calculateCost('gpt-3.5-turbo', 2000, 1000);

      expect(result.inputCost).toBe(0.001); // 2000 tokens * $0.0005/1000
      expect(result.outputCost).toBe(0.0015); // 1000 tokens * $0.0015/1000
      expect(result.totalCost).toBe(0.0025);
    });

    it('should handle zero tokens', () => {
      const result = calculator.calculateCost('gpt-4', 0, 0);

      expect(result.inputCost).toBe(0);
      expect(result.outputCost).toBe(0);
      expect(result.totalCost).toBe(0);
    });

    it('should handle large token counts', () => {
      // gpt-4: input $0.03/1k tokens, output $0.06/1k tokens
      const result = calculator.calculateCost('gpt-4', 100000, 50000);

      expect(result.inputCost).toBe(3); // 100000 tokens * $0.03/1000
      expect(result.outputCost).toBe(3); // 50000 tokens * $0.06/1000
      expect(result.totalCost).toBe(6);
    });

    it('should maintain precision to at least 4 decimal places', () => {
      // Test with values that would produce many decimal places
      const result = calculator.calculateCost('gpt-3.5-turbo', 1234, 5678);

      // Verify results have at least 4 decimal places of precision
      expect(result.inputCost.toString()).toMatch(/\d+\.\d{4,}/);
      expect(result.outputCost.toString()).toMatch(/\d+\.\d{4,}/);
      expect(result.totalCost.toString()).toMatch(/\d+\.\d{4,}/);

      // Verify actual calculation
      const expectedInputCost = (1234 / 1000) * 0.0005;
      const expectedOutputCost = (5678 / 1000) * 0.0015;

      expect(result.inputCost).toBeCloseTo(expectedInputCost, 8);
      expect(result.outputCost).toBeCloseTo(expectedOutputCost, 8);
      expect(result.totalCost).toBeCloseTo(
        expectedInputCost + expectedOutputCost,
        8
      );
    });

    it('should calculate separate input and output costs correctly', () => {
      // gpt-4-turbo: input $0.01/1k tokens, output $0.03/1k tokens
      const result = calculator.calculateCost('gpt-4-turbo', 5000, 2000);

      expect(result.inputCost).toBe(0.05); // 5000 * $0.01/1000
      expect(result.outputCost).toBe(0.06); // 2000 * $0.03/1000
      expect(result.totalCost).toBe(0.11);
    });

    it('should handle fractional token counts', () => {
      // Even though tokens are typically integers, the calculator should handle fractions
      const result = calculator.calculateCost('gpt-4', 1500, 750);

      expect(result.inputCost).toBe(0.045); // 1500 * $0.03/1000
      expect(result.outputCost).toBe(0.045); // 750 * $0.06/1000
      expect(result.totalCost).toBe(0.09);
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      const freshCalculator = new CostCalculator();
      expect(freshCalculator.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      const freshCalculator = new CostCalculator();
      await freshCalculator.loadPricingFromDatabase();
      expect(freshCalculator.isInitialized()).toBe(true);
    });
  });
});
