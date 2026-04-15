/**
 * TypeScript interfaces for the WhatsApp notifications module.
 * Uses Meta Cloud API as the underlying provider.
 */

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
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
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
