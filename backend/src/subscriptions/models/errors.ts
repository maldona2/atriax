/**
 * Custom error types for the subscription system
 */

export class AppointmentLimitExceededError extends Error {
  constructor(
    public limit: number,
    public currentUsage: number,
    public resetTime: Date
  ) {
    super(`Daily appointment limit of ${limit} exceeded`);
    this.name = 'AppointmentLimitExceededError';
  }
}
