'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, PenLine, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  cancelContract,
  disputeContract,
  signContract,
  submitContract,
} from '@/app/contracts/actions';

export function ContractActions({
  contractId,
  canSubmit,
  canSign,
  canDispute,
  canCancel,
}: {
  contractId: string;
  canSubmit: boolean;
  canSign: boolean;
  canDispute: boolean;
  canCancel: boolean;
}): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'sign' | 'dispute' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  const [consent, setConsent] = useState(false);
  // O momento mais importante do produto merece um "assinado ✓" explícito,
  // não só o badge de status trocando após o refresh.
  const [justSigned, setJustSigned] = useState(false);

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    onSuccess?: () => void,
  ): void {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? 'Erro.');
        return;
      }
      setDialog(null);
      setReason('');
      setConsent(false);
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {justSigned ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">
              Contrato assinado com sucesso
            </p>
            <p className="text-emerald-800 dark:text-emerald-300">
              Sua assinatura foi registrada com data, hora e IP, e aparece no histórico abaixo. A
              outra parte será avisada por e-mail.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canSubmit ? (
          <Button onClick={() => run(() => submitContract(contractId))} disabled={pending}>
            Enviar para assinatura
          </Button>
        ) : null}
        {canSign ? (
          <Button onClick={() => setDialog('sign')} disabled={pending || dialog === 'sign'}>
            <PenLine className="mr-1.5 h-4 w-4" aria-hidden />
            Assinar contrato
          </Button>
        ) : null}
        {canDispute ? (
          <Button variant="outline" onClick={() => setDialog('dispute')} disabled={pending}>
            Abrir disputa
          </Button>
        ) : null}
        {canCancel ? (
          <Button variant="outline" onClick={() => setDialog('cancel')} disabled={pending}>
            Cancelar contrato
          </Button>
        ) : null}
      </div>

      {dialog === 'sign' ? (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            Assinatura eletrônica
          </p>
          <p className="text-sm text-muted-foreground">
            Ao assinar, este contrato passa a valer entre as partes (MP 2.200-2/2001). A
            assinatura registra data, hora e endereço IP, e o documento fica protegido por hash —
            qualquer alteração posterior é detectável.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            Li as condições do contrato acima e concordo com todos os termos.
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending || !consent}
              onClick={() => run(() => signContract(contractId), () => setJustSigned(true))}
            >
              {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
              {pending ? 'Assinando...' : 'Assinar agora'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDialog(null)} disabled={pending}>
              Voltar
            </Button>
          </div>
        </div>
      ) : null}

      {dialog === 'dispute' || dialog === 'cancel' ? (
        <div className="space-y-2 rounded-md border p-3">
          <label className="text-sm font-medium">
            Motivo {dialog === 'dispute' ? 'da disputa' : 'do cancelamento'}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-20 w-full rounded-md border border-input bg-background p-2 text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending || reason.trim().length < 3}
              onClick={() =>
                run(() =>
                  dialog === 'dispute'
                    ? disputeContract(contractId, reason)
                    : cancelContract(contractId, reason),
                )
              }
            >
              Confirmar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDialog(null)} disabled={pending}>
              Voltar
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
