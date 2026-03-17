/**
 * Usage Enforcer - Placeholder for future AI usage enforcement
 *
 * Currently disabled since AI features are not implemented yet.
 * This service will be activated when Gold plan AI features are enabled.
 */

import { UsageCheck } from '../models/types.js';

export class UsageEnforcer {
  /**
   * Check if clinical note creation is allowed
   * Currently always returns allowed since no AI features are active
   */
  async checkClinicalNoteUsage(_userId: string): Promise<UsageCheck> {
    return { allowed: true };
  }

  /**
   * Check if recording minutes usage is allowed
   * Currently always returns allowed since no AI features are active
   */
  async checkRecordingMinutesUsage(_userId: string): Promise<UsageCheck> {
    return { allowed: true };
  }

  /**
   * Check if token usage is allowed
   * Currently always returns allowed since no AI features are active
   */
  async checkTokenUsage(
    _userId: string,
    _tokensRequested: number
  ): Promise<UsageCheck> {
    return { allowed: true };
  }

  /**
   * Record clinical note usage
   * Currently a no-op since no AI features are active
   */
  async recordClinicalNoteUsage(_userId: string): Promise<void> {
    // No-op - will be implemented when AI features are enabled
  }

  /**
   * Record recording minutes usage
   * Currently a no-op since no AI features are active
   */
  async recordRecordingMinutesUsage(
    _userId: string,
    _minutes: number
  ): Promise<void> {
    // No-op - will be implemented when AI features are enabled
  }

  /**
   * Record token usage
   * Currently a no-op since no AI features are active
   */
  async recordTokenUsage(
    _userId: string,
    _inputTokens: number,
    _outputTokens: number,
    _costUSD: number
  ): Promise<void> {
    // No-op - will be implemented when AI features are enabled
  }
}
