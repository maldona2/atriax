import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import api from '@/lib/api';
import { useAuth } from './AuthContext';
import { useChatbotAccess } from '@/hooks/useChatbotAccess';

const SESSION_KEY = 'chatbot_state';
const MAX_MESSAGES = 50;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ConversationContext {
  lastPatientId?: string;
  lastAppointmentId?: string;
  pendingIntent?: unknown;
  pendingConfirmation?: unknown;
  pendingDisambiguation?: unknown;
  accumulatedParams?: Record<string, unknown>;
}

interface ChatbotState {
  messages: ChatMessage[];
  context: ConversationContext;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
}

interface ChatbotContextValue {
  state: ChatbotState;
  hasAccess: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => void;
  toggleOpen: () => void;
  open: () => void;
  close: () => void;
}

const ChatbotContext = createContext<ChatbotContextValue | null>(null);

const defaultState: ChatbotState = {
  messages: [],
  context: {},
  isOpen: false,
  isLoading: false,
  error: null,
};

function loadFromSession(): ChatbotState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<ChatbotState>;
    return {
      messages: Array.isArray(parsed.messages)
        ? parsed.messages.slice(-MAX_MESSAGES)
        : [],
      context: parsed.context ?? {},
      isOpen: false, // Never restore open state
      isLoading: false,
      error: null,
    };
  } catch {
    return defaultState;
  }
}

function saveToSession(state: ChatbotState): void {
  try {
    const toSave = {
      messages: state.messages.slice(-MAX_MESSAGES),
      context: state.context,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
  } catch {
    // sessionStorage might be full or unavailable
  }
}

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { hasAccess } = useChatbotAccess();
  const [state, setState] = useState<ChatbotState>(loadFromSession);
  const prevUserRef = useRef(user);

  // Persist to sessionStorage on state changes
  useEffect(() => {
    saveToSession(state);
  }, [state]);

  // Clear state on logout
  useEffect(() => {
    if (prevUserRef.current && !user) {
      setState(defaultState);
      sessionStorage.removeItem(SESSION_KEY);
    }
    prevUserRef.current = user;
  }, [user]);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim() || state.isLoading) return;

      const userMessage: ChatMessage = {
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      setState((s) => ({
        ...s,
        messages: [...s.messages, userMessage].slice(-MAX_MESSAGES),
        isLoading: true,
        error: null,
      }));

      try {
        const { data } = await api.post<{
          response: string;
          context: ConversationContext;
        }>('/chatbot/message', {
          message: text.trim(),
          context: state.context,
        });

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
        };

        setState((s) => {
          // Notify appointments page when an appointment is created or modified
          if (
            data.context.lastAppointmentId &&
            data.context.lastAppointmentId !== s.context.lastAppointmentId
          ) {
            window.dispatchEvent(
              new CustomEvent('chatbot:appointment-changed')
            );
          }
          return {
            ...s,
            messages: [...s.messages, assistantMessage].slice(-MAX_MESSAGES),
            context: data.context,
            isLoading: false,
            error: null,
          };
        });
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: {
            status?: number;
            data?: { error?: { message?: string } };
          };
          message?: string;
        };

        let errorMessage: string;

        if (axiosErr.response?.status === 429) {
          errorMessage =
            'Demasiados mensajes. Por favor, espera un momento antes de continuar.';
        } else if (axiosErr.response?.status === 403) {
          errorMessage =
            'No tienes acceso al asistente de IA. Actualiza tu plan para usar esta función.';
        } else if (axiosErr.response?.data?.error?.message) {
          errorMessage = axiosErr.response.data.error.message;
        } else if (!navigator.onLine) {
          errorMessage =
            'Sin conexión a internet. Por favor, verifica tu conexión e intenta nuevamente.';
        } else {
          errorMessage =
            'Error al procesar tu mensaje. Por favor, intenta nuevamente.';
        }

        const errorChatMessage: ChatMessage = {
          role: 'assistant',
          content: `❌ ${errorMessage}`,
          timestamp: new Date().toISOString(),
        };

        setState((s) => ({
          ...s,
          messages: [...s.messages, errorChatMessage].slice(-MAX_MESSAGES),
          isLoading: false,
          error: errorMessage,
        }));
      }
    },
    [state.context, state.isLoading]
  );

  const clearHistory = useCallback(() => {
    setState((s) => ({
      ...s,
      messages: [],
      context: {},
      error: null,
    }));
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const toggleOpen = useCallback(() => {
    setState((s) => ({ ...s, isOpen: !s.isOpen }));
  }, []);

  const open = useCallback(() => {
    setState((s) => ({ ...s, isOpen: true }));
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }));
  }, []);

  const value: ChatbotContextValue = {
    state,
    hasAccess,
    sendMessage,
    clearHistory,
    toggleOpen,
    open,
    close,
  };

  return (
    <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const ctx = useContext(ChatbotContext);
  if (!ctx) throw new Error('useChatbot must be used within ChatbotProvider');
  return ctx;
}
