/**
 * Subscription tiers available in the system
 */
export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium'
}

/**
 * Subscription status values
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PENDING = 'pending'
}

/**
 * Resource types for limit checking
 */
export enum ResourceType {
  PATIENTS = 'patients',
  CALENDAR = 'calendar',
  APPOINTMENTS = 'appointments'
}

/**
 * Subscription model
 */
export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  patientLimit: number;
  hasCalendarAccess: boolean;
  startDate: Date;
  endDate?: Date;
  status: SubscriptionStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Limit check result
 */
export interface LimitCheck {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  message?: string;
}