/**
 * Plan Manager - Defines and manages subscription plan configurations
 */

import { SubscriptionPlan, PlanName, SENTINEL_VALUE } from '../models/types.js';

export const FREE_PLAN_DAILY_APPOINTMENT_LIMIT = 3;

/**
 * Subscription plan definitions
 * Prices are in ARS (Argentine Pesos)
 */
const PLANS: Record<PlanName, SubscriptionPlan> = {
  pro: {
    name: 'pro',
    priceARS: 1500,
    dailyAppointmentLimit: 50,
    features: {
      calendarSync: true,
      patientDatabase: true,
      aiFeatures: false,
      whatsappIntegration: false,
    },
  },
  gold: {
    name: 'gold',
    priceARS: 30000,
    dailyAppointmentLimit: SENTINEL_VALUE, // -1 = unlimited
    features: {
      calendarSync: true,
      patientDatabase: true,
      aiFeatures: true,
      whatsappIntegration: true,
    },
    disabled: true, // Not available yet
  },
};

export class PlanManager {
  /**
   * Get all available subscription plans
   */
  getPlans(): SubscriptionPlan[] {
    return Object.values(PLANS);
  }

  /**
   * Get a specific plan by name
   */
  getPlan(name: string): SubscriptionPlan | null {
    return PLANS[name as PlanName] || null;
  }

  /**
   * Get features for a specific plan
   */
  getFeatures(planName: string): SubscriptionPlan['features'] | null {
    const plan = this.getPlan(planName);
    return plan ? plan.features : null;
  }

  /**
   * Check if a plan is currently disabled
   */
  isDisabled(planName: string): boolean {
    const plan = this.getPlan(planName);
    return plan?.disabled === true;
  }

  /**
   * Get the daily appointment limit for a given plan name.
   * Returns FREE_PLAN_DAILY_APPOINTMENT_LIMIT for 'free' or unknown plans.
   * Returns SENTINEL_VALUE (-1) for unlimited plans.
   */
  getDailyAppointmentLimit(planName: string): number {
    if (planName === 'free') {
      return FREE_PLAN_DAILY_APPOINTMENT_LIMIT;
    }
    const plan = this.getPlan(planName);
    if (!plan) {
      return FREE_PLAN_DAILY_APPOINTMENT_LIMIT;
    }
    return plan.dailyAppointmentLimit;
  }
}
