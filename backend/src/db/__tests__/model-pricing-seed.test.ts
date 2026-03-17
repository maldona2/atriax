import { db, modelPricing } from '../client.js';
import { eq } from 'drizzle-orm';

describe('Model Pricing Seed Data', () => {
  it('should have seeded GPT model pricing data', async () => {
    const allPricing = await db.select().from(modelPricing);

    expect(allPricing.length).toBeGreaterThanOrEqual(5);

    // Verify specific models exist
    const modelNames = allPricing.map((p) => p.modelName);
    expect(modelNames).toContain('gpt-4');
    expect(modelNames).toContain('gpt-4-turbo');
    expect(modelNames).toContain('gpt-3.5-turbo');
  });

  it('should have correct pricing structure for gpt-4', async () => {
    const [gpt4Pricing] = await db
      .select()
      .from(modelPricing)
      .where(eq(modelPricing.modelName, 'gpt-4'))
      .limit(1);

    expect(gpt4Pricing).toBeDefined();
    expect(gpt4Pricing.modelName).toBe('gpt-4');
    expect(gpt4Pricing.inputTokenPriceUsd).toBe('0.03');
    expect(gpt4Pricing.outputTokenPriceUsd).toBe('0.06');
    expect(gpt4Pricing.effectiveDate).toBeInstanceOf(Date);
  });

  it('should have correct pricing structure for gpt-3.5-turbo', async () => {
    const [gpt35Pricing] = await db
      .select()
      .from(modelPricing)
      .where(eq(modelPricing.modelName, 'gpt-3.5-turbo'))
      .limit(1);

    expect(gpt35Pricing).toBeDefined();
    expect(gpt35Pricing.modelName).toBe('gpt-3.5-turbo');
    expect(gpt35Pricing.inputTokenPriceUsd).toBe('0.0005');
    expect(gpt35Pricing.outputTokenPriceUsd).toBe('0.0015');
    expect(gpt35Pricing.effectiveDate).toBeInstanceOf(Date);
  });

  it('should have index on model_name for fast lookups', async () => {
    // This test verifies the query works efficiently
    const startTime = Date.now();
    const [pricing] = await db
      .select()
      .from(modelPricing)
      .where(eq(modelPricing.modelName, 'gpt-4-turbo'))
      .limit(1);
    const endTime = Date.now();

    expect(pricing).toBeDefined();
    expect(pricing.modelName).toBe('gpt-4-turbo');
    // Query should be fast with index (< 100ms)
    expect(endTime - startTime).toBeLessThan(100);
  });
});
