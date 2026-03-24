/**
 * Type definitions for Mercado Pago Subscription System
 */

// ─── Subscription Plans ──────────────────────────────────────────────────────

export type PlanName = 'pro' | 'gold';

export interface SubscriptionPlan {
  name: PlanName;
  priceARS: number;
  dailyAppointmentLimit: number; // -1 for unlimited
  features: {
    calendarSync: boolean;
    patientDatabase: boolean;
    aiFeatures: boolean;
    whatsappIntegration: boolean;
  };
  disabled?: boolean;
}

// ─── Mercado Pago Integration ────────────────────────────────────────────────

export interface PreApprovalRequest {
  userId: string;
  plan: PlanName;
  priceARS: number;
  frequency: 'monthly';
  callbackUrl: string;
  userEmail: string;
}

export interface PreApprovalResponse {
  preApprovalId: string;
  initializationUrl: string;
  status: string;
}

export interface SubscriptionAction {
  preApprovalId: string;
}

export interface ExternalReference {
  userId: string;
  plan: PlanName;
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

export interface PaymentWebhook {
  id: string;
  type: 'payment';
  data: {
    id: string;
  };
}

export interface PreApprovalWebhook {
  id: string;
  type: 'preapproval';
  action: 'authorized' | 'cancelled' | 'paused' | 'failed';
  data: {
    id: string;
  };
}

// ─── Token Usage ─────────────────────────────────────────────────────────────

export interface TokenUsage {
  userId: string;
  billingMonth: string; // Format: YYYY-MM
  tokensUsed: number;
  costUsedUSD: number;
}

// ─── Cost Calculation ────────────────────────────────────────────────────────

export interface ModelPricing {
  model: string;
  inputTokenPriceUSD: number; // Price per 1000 tokens
  outputTokenPriceUSD: number; // Price per 1000 tokens
}

export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

// ─── Usage Enforcement ───────────────────────────────────────────────────────

export interface UsageCheck {
  allowed: boolean;
  reason?: string;
  remaining?: number;
}

// ─── API Types ───────────────────────────────────────────────────────────────

export interface CreateSubscriptionRequest {
  userId: string;
  plan: 'pro' | 'gold';
}

export interface SubscriptionStatusResponse {
  userId: string;
  plan: PlanName | 'free';
  status: 'active' | 'paused' | 'cancelled';
  dailyAppointmentLimit: number; // -1 for unlimited
  features: {
    appointments: boolean; // derived: dailyAppointmentLimit > 0 || dailyAppointmentLimit === -1
    calendarSync: boolean;
    patientDatabase: boolean;
    aiFeatures: boolean;
    whatsappIntegration: boolean;
  };
  billingPeriod?: {
    start: string;
    end: string;
  };
}

// ─── Limit Check ─────────────────────────────────────────────────────────────

export interface LimitCheckResult {
  allowed: boolean;
  limit: number; // -1 for unlimited
  currentUsage: number;
  remaining: number; // -1 for unlimited
  resetTime: Date; // Next midnight UTC
  reason?: string; // Present when allowed = false
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const SENTINEL_VALUE = -1; // Represents unlimited usage
