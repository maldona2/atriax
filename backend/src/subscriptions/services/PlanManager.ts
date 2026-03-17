/**
 * Plan Manager - Defines and manages subscription plan configurations
 */

import { SubscriptionPlan, PlanName, SENTINEL_VALUE } from '../models/types.js';

/**
 * Subscription plan definitions
 * Prices are in ARS (Argentine Pesos)
 */
const PLANS: Record<PlanName, SubscriptionPlan> = {
  pro: {
    name: 'pro',
    priceARS: 15000,
    features: {
      appointments: true,
      calendarSync: true,
      patientDatabase: true,
      aiFeatures: false,
      whatsappIntegration: false,
    },
  },
  gold: {
    name: 'gold',
    priceARS: 30000,
    features: {
      appointments: true,
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
}
