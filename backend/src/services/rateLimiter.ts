import logger from '../utils/logger.js';
import { googleCalendarConfig } from '../config/googleCalendar.js';

export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRatePerMs: number;
  private lastRefillTime: number;
  private callsThisMinute: number;
  private minuteWindowStart: number;
  private readonly maxPerMinute: number;

  constructor(
    requestsPerSecond = googleCalendarConfig.rateLimit.requestsPerSecond,
    requestsPerMinute = googleCalendarConfig.rateLimit.requestsPerMinute
  ) {
    this.maxTokens = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.refillRatePerMs = requestsPerSecond / 1000;
    this.lastRefillTime = Date.now();
    this.maxPerMinute = requestsPerMinute;
    this.callsThisMinute = 0;
    this.minuteWindowStart = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensToAdd = elapsed * this.refillRatePerMs;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;

    const minuteElapsed = now - this.minuteWindowStart;
    if (minuteElapsed >= 60000) {
      this.callsThisMinute = 0;
      this.minuteWindowStart = now;
    }
  }

  canProceed(): boolean {
    this.refill();
    return this.tokens >= 1 && this.callsThisMinute < this.maxPerMinute;
  }

  recordCall(): void {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
    }
    this.callsThisMinute += 1;
  }

  msUntilNextSlot(): number {
    this.refill();
    if (this.canProceed()) return 0;

    if (this.callsThisMinute >= this.maxPerMinute) {
      const msUntilMinuteReset = 60000 - (Date.now() - this.minuteWindowStart);
      return Math.max(0, msUntilMinuteReset);
    }

    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRatePerMs);
  }

  async waitForCapacity(): Promise<void> {
    const waitMs = this.msUntilNextSlot();
    if (waitMs > 0) {
      logger.info({ waitMs }, 'Rate limiter: waiting for capacity');
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

export const googleCalendarRateLimiter = new RateLimiter();
