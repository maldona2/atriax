/**
 * Cost Calculator - Calculates OpenAI API costs based on model and token usage
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { ModelPricing, CostCalculation } from '../models/types.js';
import { db, modelPricing as modelPricingTable } from '../../db/client.js';
import { eq } from 'drizzle-orm';
import logger from '../../utils/logger.js';

export class CostCalculator {
  private pricingTable: Map<string, ModelPricing>;
  private initialized: boolean;

  constructor() {
    this.pricingTable = new Map();
    this.initialized = false;
  }

  /**
   * Load pricing data from model_pricing table
   * This method should be called before using the calculator
   */
  /**
   * Load pricing data from model_pricing table
   * This method should be called before using the calculator
   */
  async loadPricingFromDatabase(): Promise<void> {
    try {
      logger.info('Loading model pricing from database');

      const pricingRecords = await db.select().from(modelPricingTable);

      this.pricingTable.clear();

      for (const record of pricingRecords) {
        this.pricingTable.set(record.modelName, {
          model: record.modelName,
          inputTokenPriceUSD: parseFloat(record.inputTokenPriceUsd),
          outputTokenPriceUSD: parseFloat(record.outputTokenPriceUsd),
        });
      }

      this.initialized = true;

      logger.info(
        {
          modelCount: this.pricingTable.size,
          models: Array.from(this.pricingTable.keys()),
        },
        'Model pricing loaded successfully'
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Configuration error: Failed to load model pricing from database'
      );
      throw new Error(
        `Failed to load model pricing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate cost for an OpenAI API call
   * Ensures precision to at least 4 decimal places (actually uses 8 for safety)
   *
   * @param model - The OpenAI model name
   * @param inputTokens - Number of input tokens consumed
   * @param outputTokens - Number of output tokens consumed
   * @returns CostCalculation with input, output, and total costs in USD
   * @throws Error if pricing not found for the model or calculator not initialized
   */
  /**
   * Calculate cost for an OpenAI API call
   * Ensures precision to at least 4 decimal places (actually uses 8 for safety)
   *
   * @param model - The OpenAI model name
   * @param inputTokens - Number of input tokens consumed
   * @param outputTokens - Number of output tokens consumed
   * @returns CostCalculation with input, output, and total costs in USD
   * @throws Error if pricing not found for the model or calculator not initialized
   */
  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): CostCalculation {
    try {
      if (!this.initialized) {
        logger.error('Configuration error: CostCalculator not initialized');
        throw new Error(
          'CostCalculator not initialized. Call loadPricingFromDatabase() first.'
        );
      }

      logger.info({ model, inputTokens, outputTokens }, 'Calculating API cost');

      const pricing = this.getPricing(model);

      if (!pricing) {
        logger.error(
          { model },
          'Configuration error: Pricing not found for model'
        );
        throw new Error(`Pricing not found for model: ${model}`);
      }

      // Calculate costs per 1000 tokens
      const inputCost = (inputTokens / 1000) * pricing.inputTokenPriceUSD;
      const outputCost = (outputTokens / 1000) * pricing.outputTokenPriceUSD;
      const totalCost = inputCost + outputCost;

      // Ensure precision to at least 4 decimal places (using 8 for safety)
      const result = {
        inputCost: parseFloat(inputCost.toFixed(8)),
        outputCost: parseFloat(outputCost.toFixed(8)),
        totalCost: parseFloat(totalCost.toFixed(8)),
      };

      logger.info(
        {
          model,
          inputTokens,
          outputTokens,
          ...result,
        },
        'API cost calculated successfully'
      );

      return result;
    } catch (error) {
      logger.error(
        {
          model,
          inputTokens,
          outputTokens,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Error calculating API cost'
      );
      throw error;
    }
  }

  /**
   * Get pricing for a specific model
   *
   * @param model - The OpenAI model name
   * @returns ModelPricing object or null if not found
   */
  getPricing(model: string): ModelPricing | null {
    return this.pricingTable.get(model) || null;
  }

  /**
   * Check if the calculator has been initialized with database pricing
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
