import { useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Bot, X, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatbot } from '@/contexts/ChatbotContext';
import { ChatbotMessage } from './ChatbotMessage';
import { ChatbotInput } from './ChatbotInput';

const WIDGET_ID = 'chatbot-widget';
const LIVE_REGION_ID = 'chatbot-live-region';

/**
 * Inner panel shown when the chatbot is open.
 */
function ChatbotPanel() {
  const { state, sendMessage, clearHistory, close } = useChatbot();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  // Focus management: focus input when panel opens
  useEffect(() => {
    const input = inputRef.current?.querySelector('input');
    if (input) {
      setTimeout(() => input.focus(), 50);
    }
  }, []);

  // Keyboard shortcut: Escape to close
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    },
    [close]
  );

  return (
    <div
      id={WIDGET_ID}
      role="dialog"
      aria-label="Asistente de IA"
      aria-modal="false"
      className="flex flex-col w-80 sm:w-96 h-[520px] bg-background border border-border rounded-lg shadow-xl"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" aria-hidden="true" />
          <span className="text-sm font-semibold">Asistente IA</span>
          {state.isLoading && (
            <Loader2
              className="w-3 h-3 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearHistory}
            aria-label="Limpiar historial"
            title="Limpiar historial"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={close}
            aria-label="Cerrar asistente"
            title="Cerrar (Esc)"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-3"
        role="list"
        aria-label="Historial de conversación"
        aria-live="polite"
        aria-relevant="additions"
      >
        {state.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground text-sm gap-2 px-4">
            <Bot className="w-10 h-10 opacity-40" />
            <p className="font-medium">Asistente de IA</p>
            <p>
              Puedo ayudarte con turnos y pacientes. Escribe un mensaje para
              comenzar o di <strong>"ayuda"</strong> para ver los comandos
              disponibles.
            </p>
          </div>
        )}
        {state.messages.map((msg, idx) => (
          <ChatbotMessage key={idx} message={msg} />
        ))}
        {state.isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Bot className="w-4 h-4" aria-hidden="true" />
            <div
              className="flex gap-1"
              aria-label="El asistente está escribiendo"
            >
              <span
                className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* ARIA live region for screen readers */}
      <div
        id={LIVE_REGION_ID}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {state.messages.at(-1)?.role === 'assistant'
          ? state.messages.at(-1)?.content
          : ''}
      </div>

      {/* Input */}
      <div ref={inputRef}>
        <ChatbotInput onSend={sendMessage} isLoading={state.isLoading} />
      </div>
    </div>
  );
}

/**
 * Floating chatbot widget anchored to the bottom-right corner.
 * Only visible for Gold plan users.
 * Supports Ctrl+K to open and Escape to close.
 */
export function ChatbotWidget() {
  const { state, hasAccess, toggleOpen, open } = useChatbot();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        open();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [open]);

  if (!hasAccess) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
      aria-label="Asistente de IA"
    >
      {/* Panel */}
      {state.isOpen && (
        <Suspense fallback={null}>
          <ChatbotPanel />
        </Suspense>
      )}

      {/* Floating button */}
      {!state.isOpen && (
        <Button
          size="icon"
          className="w-12 h-12 rounded-full shadow-lg"
          onClick={toggleOpen}
          aria-label="Abrir asistente de IA (Ctrl+K)"
          title="Asistente de IA (Ctrl+K)"
        >
          <Bot className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}
