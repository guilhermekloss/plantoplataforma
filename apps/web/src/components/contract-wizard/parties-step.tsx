'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteProducer, searchProducers, type ProducerSummary } from '@/app/contracts/actions';
import type { StepProps } from '@/components/contract-wizard/wizard-state';

export function PartiesStep({ state, set }: StepProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProducerSummary[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  async function doSearch(q: string): Promise<void> {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setResults(await searchProducers(q));
  }

  async function doInvite(): Promise<void> {
    setInviteMsg(null);
    const res = await inviteProducer(inviteEmail);
    setInviteMsg(res.ok ? 'Convite enviado! O produtor aparecerá após aceitar.' : res.error ?? 'Erro.');
  }

  return (
    <div className="space-y-4">
      <h2 className="font-medium">Produtor (vendedor)</h2>
      {state.seller ? (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
          <div>
            <p className="font-medium">{state.seller.name}</p>
            <p className="text-sm text-muted-foreground">
              {state.seller.cpf ?? 'CPF não informado'} · {state.seller.city ?? '—'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => set('seller', null)}>
            Trocar
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="producer-search">Buscar por nome ou CPF</Label>
            <Input
              id="producer-search"
              value={query}
              onChange={(e) => doSearch(e.target.value)}
              placeholder="Digite ao menos 2 caracteres"
            />
          </div>
          {results.length > 0 && (
            <ul className="divide-y rounded-md border">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => set('seller', p)}
                    className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
                  >
                    <span>{p.name}</span>
                    <span className="text-sm text-muted-foreground">{p.city ?? '—'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setShowInvite((s) => !s)}
            className="text-sm font-medium text-primary hover:underline"
          >
            + Convidar novo produtor
          </button>
          {showInvite && (
            <div className="space-y-2 rounded-md border p-3">
              <Label htmlFor="invite-email">Email do produtor</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button size="sm" onClick={doInvite} disabled={!inviteEmail}>
                Enviar convite
              </Button>
              {inviteMsg ? <p className="text-sm text-muted-foreground">{inviteMsg}</p> : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
