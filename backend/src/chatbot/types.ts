/**
 * Core TypeScript interfaces for the AI Chatbot Assistant
 */

export type IntentOperation =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'search'
  | 'help'
  | 'reset'
  | 'unknown';

export type IntentEntity = 'appointment' | 'patient' | 'session' | 'none';

export interface Intent {
  operation: IntentOperation;
  entity: IntentEntity;
  params: Record<string, unknown>;
  confidence: number;
  rawText: string;
}

export interface PendingConfirmation {
  intent: Intent;
  prompt: string;
  expiresAt: number; // Unix ms timestamp
}

export interface DisambiguationOption {
  id: string;
  label: string;
}

export interface PendingDisambiguation {
  intent: Intent;
  options: DisambiguationOption[];
  question: string;
  field: string; // which field caused disambiguation
}

export interface ConversationContext {
  lastPatientId?: string;
  lastAppointmentId?: string;
  pendingIntent?: Intent;
  pendingConfirmation?: PendingConfirmation;
  pendingDisambiguation?: PendingDisambiguation;
  accumulatedParams?: Record<string, unknown>;
  pendingField?: string; // which field is being collected in the current multi-turn prompt
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatbotRequest {
  message: string;
  context: ConversationContext;
}

export interface ChatbotResponse {
  response: string;
  context: ConversationContext;
}

// Destructive operations requiring confirmation
export const DESTRUCTIVE_OPERATIONS: Array<{
  operation: IntentOperation;
  entity: IntentEntity;
}> = [
  { operation: 'delete', entity: 'patient' },
  { operation: 'delete', entity: 'appointment' },
  { operation: 'delete', entity: 'session' },
  { operation: 'delete', entity: 'none' },
  // Cancel appointment is also destructive
  { operation: 'update', entity: 'appointment' }, // when status=cancelled
];

export const CONFIRMATION_TIMEOUT_MS =
  (Number(process.env.CHATBOT_CONFIRMATION_TIMEOUT_MINUTES) || 5) * 60 * 1000;

export const MAX_DISAMBIGUATION_OPTIONS =
  Number(process.env.CHATBOT_MAX_DISAMBIGUATION_OPTIONS) || 5;
