'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { FileText, LayoutDashboard, MessagesSquare, SendHorizonal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { askAssistant, type AssistantTurn } from '@/app/ai-actions';

const SUGGESTIONS = [
  'Qual contrato vence primeiro?',
  'Quanto vou receber no total dos meus contratos?',
  'O que acontece se eu entregar com 15% de umidade?',
  'O que é wash out?',
];

function AssistantAvatar(): React.ReactElement {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10"
      aria-hidden
    >
      <Sparkles className="h-4 w-4 text-primary" />
    </span>
  );
}

/** Coluna lateral persistente: perguntas frequentes + atalhos, sempre à mão durante a conversa. */
function AssistantSidebar({ onPick }: { onPick: (text: string) => void }): React.ReactElement {
  return (
    <aside className="hidden shrink-0 flex-col gap-4 lg:sticky lg:top-20 lg:flex">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <MessagesSquare className="h-4 w-4 text-primary" aria-hidden />
          Perguntas frequentes
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className="rounded-lg border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-accent-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="text-sm font-medium">Atalhos</p>
        <div className="mt-3 flex flex-col gap-1">
          <Link
            href="/contracts"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <FileText className="h-4 w-4" aria-hidden />
            Ver contratos
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            Voltar ao painel
          </Link>
        </div>
      </div>
    </aside>
  );
}

export function AssistantChat(): React.ReactElement {
  const [messages, setMessages] = useState<AssistantTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    const history = messages;
    const next: AssistantTurn[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    const res = await askAssistant(trimmed, history);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'Erro.');
      return;
    }
    setMessages((m) => [...m, { role: 'assistant', content: res.reply ?? '' }]);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 lg:grid lg:grid-cols-3 lg:items-start">
      <div className="flex min-h-[70vh] flex-1 flex-col lg:col-span-2">
        <div
          className={
            messages.length === 0
              ? 'flex flex-1 flex-col justify-center overflow-y-auto pb-4'
              : 'flex-1 space-y-3 overflow-y-auto pb-4'
          }
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10" aria-hidden>
                <Sparkles className="h-7 w-7 text-primary" />
              </span>
              <div>
                <p className="font-medium">Como posso ajudar hoje?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pergunte sobre seus contratos, prazos, pagamentos e descontos por qualidade.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 lg:hidden">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border bg-card px-3.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-accent-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user'
                    ? 'flex justify-end'
                    : 'flex items-end justify-start gap-2'
                }
              >
                {m.role === 'assistant' ? <AssistantAvatar /> : null}
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground shadow-sm'
                      : 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border bg-card px-4 py-2 text-sm shadow-sm'
                  }
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
          {loading ? (
            <div className="flex items-end gap-2">
              <AssistantAvatar />
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border bg-card px-4 py-3 shadow-sm" aria-label="Pensando">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
              </div>
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="sticky bottom-0 flex gap-2 border-t bg-background py-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva sua pergunta..."
            disabled={loading}
            className="rounded-full px-4"
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 rounded-full"
            disabled={loading || !input.trim()}
            aria-label="Enviar"
          >
            <SendHorizonal className="h-4 w-4" aria-hidden />
          </Button>
        </form>
      </div>

      <AssistantSidebar onPick={send} />
    </div>
  );
}
