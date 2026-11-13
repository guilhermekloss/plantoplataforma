'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { explainContract } from '@/app/ai-actions';

/** Renderiza negrito (**...**) num texto simples. */
function renderInline(text: string): React.ReactNode {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((p, i) =>
      p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
    );
}

/** Renderiza um subconjunto simples de markdown (negrito + bullets) para mobile. */
function renderLine(line: string, key: number): React.ReactNode {
  if (line.trim() === '') return <div key={key} className="h-2" />;
  if (line.trimStart().startsWith('- ')) {
    return (
      <li key={key} className="ml-5 list-disc text-sm leading-relaxed">
        {renderInline(line.trimStart().slice(2))}
      </li>
    );
  }
  return (
    <p key={key} className="text-sm leading-relaxed">
      {renderInline(line)}
    </p>
  );
}

export function ContractExplainer({ contractId }: { contractId: string }): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function onExplain(): Promise<void> {
    setLoading(true);
    setError(null);
    const res = await explainContract(contractId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'Erro.');
      return;
    }
    setEnabled(res.enabled ?? true);
    setText(res.explanation ?? '');
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Entenda em linguagem simples</h3>
          <p className="text-xs text-muted-foreground">
            Resumo claro do que você está assinando — sem juridiquês.
          </p>
        </div>
        {!text ? (
          <Button size="sm" onClick={onExplain} disabled={loading}>
            {loading ? 'Gerando...' : '✨ Explicar'}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={onExplain} disabled={loading}>
            {loading ? '...' : 'Refazer'}
          </Button>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      {text ? (
        <div className="mt-3 space-y-1">
          {text.split('\n').map((line, i) => renderLine(line, i))}
          {!enabled ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Resumo automático. Ative a IA (GEMINI_API_KEY) para uma explicação personalizada.
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Gerado por IA a partir dos dados deste contrato. Confira sempre os valores oficiais acima.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
