/**
 * Token Tracker - Placeholder for future AI token tracking
 *
 * Currently disabled since AI features are not implemented yet.
 * This service will be activated when Gold plan AI features are enabled.
 */

import { TokenUsage } from '../models/types.js';

export class TokenTracker {
  /**
   * Set the cost calculator for integrated cost tracking
   * Currently a no-op since no AI features are active
   */
  setCostCalculator(_calculator: any): void {
    // No-op - will be implemented when AI features are enabled
  }

  /**
   * Record token usage for a user
   * Currently a no-op since no AI features are active
   */
  async recordTokenUsage(_userId: string, _tokens: number): Promise<void> {
    // No-op - will be implemented when AI features are enabled
  }

  /**
   * Get current token usage for a user
   * Currently returns zero usage since no AI features are active
   */
  async getCurrentUsage(userId: string): Promise<TokenUsage> {
    const currentMonth = this.getCurrentBillingMonth();
    return {
      userId,
      billingMonth: currentMonth,
      tokensUsed: 0,
      costUsedUSD: 0,
    };
  }

  /**
   * Reset monthly usage for a user
   * Currently a no-op since no AI features are active
   */
  async resetMonthlyUsage(_userId: string): Promise<void> {
    // No-op - will be implemented when AI features are enabled
  }

  /**
   * Check if a user can consume the estimated tokens
   * Currently always returns true since no AI features are active
   */
  async canConsumeTokens(
    _userId: string,
    _estimatedTokens: number
  ): Promise<boolean> {
    return true;
  }

  /**
   * Record token usage with automatic cost calculation
   * Currently a no-op since no AI features are active
   */
  async recordTokenUsageWithCost(
    _userId: string,
    _model: string,
    _inputTokens: number,
    _outputTokens: number
  ): Promise<void> {
    // No-op - will be implemented when AI features are enabled
  }

  /**
   * Get current billing month in YYYY-MM format
   */
  private getCurrentBillingMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
