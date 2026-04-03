import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatbotInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function ChatbotInput({ onSend, isLoading }: ChatbotInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || isLoading) return;
      onSend(trimmed);
      setValue('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 p-3 border-t bg-background"
      aria-label="Enviar mensaje al asistente"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe un mensaje..."
        disabled={isLoading}
        aria-label="Mensaje para el asistente"
        className="flex-1 text-sm"
        autoComplete="off"
        maxLength={1000}
      />
      <Button
        type="submit"
        size="icon"
        disabled={isLoading || !value.trim()}
        aria-label="Enviar mensaje"
      >
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}
