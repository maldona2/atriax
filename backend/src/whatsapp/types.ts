/**
 * TypeScript interfaces for the WhatsApp Bot module.
 * Uses Meta Cloud API as the underlying provider.
 */

export type { ConversationContext } from '../chatbot/types.js';

// ─── Meta Cloud API webhook payload shapes ────────────────────────────────────

export interface MetaWebhookEntry {
  id: string;
  changes: MetaWebhookChange[];
}

export interface MetaWebhookChange {
  value: MetaWebhookValue;
  field: string;
}

export interface MetaWebhookValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: MetaContact[];
  messages?: MetaInboundMessage[];
  statuses?: MetaMessageStatus[];
}

export interface MetaContact {
  profile: { name: string };
  wa_id: string;
}

export interface MetaInboundMessage {
  from: string; // E.164 without leading +
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'interactive';
  text?: { body: string };
}

export interface MetaMessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

export interface MetaWebhookPayload {
  object: 'whatsapp_business_account';
  entry: MetaWebhookEntry[];
}

// ─── Internal service interfaces ──────────────────────────────────────────────

export interface IncomingWhatsAppMessage {
  tenantId: string;
  phoneNumber: string; // E.164 format with leading +
  text: string;
  metaMessageId: string;
}

export interface WhatsAppSessionRecord {
  id: string;
  tenantId: string;
  phoneNumber: string;
  context: import('../chatbot/types.js').ConversationContext;
  lastMessageAt: Date | null;
  expiresAt: Date;
}

export interface PhoneVerificationResult {
  success: boolean;
  message: string;
}

export interface MetaApiSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Circuit breaker states ───────────────────────────────────────────────────

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureAt: number | null;
  nextAttemptAt: number | null;
}
