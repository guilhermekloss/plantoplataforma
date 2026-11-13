'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, History } from 'lucide-react';
import { defaultQualityParams, sacksToTons, type GrainType } from '@plantor/shared';
import { Button } from '@/components/ui/button';
import { PartiesStep } from '@/components/contract-wizard/parties-step';
import { ObjectStep } from '@/components/contract-wizard/object-step';
import { PriceStep } from '@/components/contract-wizard/price-step';
import { DeliveryStep } from '@/components/contract-wizard/delivery-step';
import { ReviewStep } from '@/components/contract-wizard/review-step';
import {
  STEPS,
  initialState,
  todayISO,
  type WizardState,
} from '@/components/contract-wizard/wizard-state';
import { createContract } from '../actions';

// Rascunho local: um refresh ou queda de conexão não pode custar 5 etapas preenchidas.
const DRAFT_KEY = 'plantor:contract-draft:v1';

function loadDraft(): { step: number; state: WizardState } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as { step?: number; state?: WizardState };
    if (!draft.state || typeof draft.step !== 'number') return null;
    return { step: draft.step, state: { ...initialState(), ...draft.state } };
  } catch {
    return null;
  }
}

export default function NewContractPage(): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [restored, setRestored] = useState(false);
  const hydrated = useRef(false);

  // Restaura o rascunho após a hidratação (localStorage não existe no SSR).
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setState(draft.state);
      setStep(draft.step);
      setRestored(true);
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, state }));
    } catch {
      // Sem espaço/modo privado: o wizard segue funcionando sem rascunho.
    }
  }, [step, state]);

  function discardDraft(): void {
    localStorage.removeItem(DRAFT_KEY);
    setState(initialState());
    setStep(0);
    setRestored(false);
    setError(null);
  }

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]): void {
    setState((s) => ({ ...s, [key]: value }));
  }

  // Ao trocar de grão, re-preenche os defaults MAPA.
  function onGrainChange(grain: GrainType): void {
    const q = defaultQualityParams(grain);
    setState((s) => ({
      ...s,
      grainType: grain,
      maxMoisturePct: String(q.maxMoisturePct),
      maxImpurityPct: String(q.maxImpurityPct),
      minSpecificWeightGL: q.minSpecificWeightGL ? String(q.minSpecificWeightGL) : '',
      maxDamagedPct: String(q.maxDamagedPct),
    }));
  }

  function validateStep(): string | null {
    if (step === 0 && !state.seller) return 'Selecione um produtor.';
    if (step === 1) {
      if (!state.quantitySacks || Number(state.quantitySacks) <= 0)
        return 'Informe a quantidade de sacas.';
      if (!/^\d{4}\/\d{4}$/.test(state.harvestYear)) return 'Safra no formato 2025/2026.';
    }
    if (step === 2 && state.priceType === 'fixo' && !state.pricePerSackReais)
      return 'Informe o valor por saca.';
    if (step === 3) {
      if (!state.warehouseName) return 'Informe o armazém.';
      if (!state.warehouseCity || !state.warehouseState) return 'Informe cidade e UF do armazém.';
      if (!state.deliveryDeadline) return 'Informe a data limite de entrega.';
      if (state.deliveryDeadline <= todayISO) return 'A data de entrega deve ser futura.';
    }
    return null;
  }

  function next(): void {
    const v = validateStep();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back(): void {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function buildPayload(): Record<string, unknown> {
    const perSackCents =
      state.priceType === 'fixo' && state.pricePerSackReais
        ? Math.round(Number(state.pricePerSackReais) * 100)
        : undefined;
    return {
      sellerId: state.seller!.id,
      grainType: state.grainType,
      quantitySacks: Number(state.quantitySacks),
      harvestYear: state.harvestYear,
      harvestPeriod: state.harvestPeriod,
      maxMoisturePct: Number(state.maxMoisturePct),
      maxImpurityPct: Number(state.maxImpurityPct),
      minSpecificWeightGL: state.minSpecificWeightGL ? Number(state.minSpecificWeightGL) : undefined,
      maxDamagedPct: state.maxDamagedPct ? Number(state.maxDamagedPct) : undefined,
      qualityAdjType: state.qualityAdjType,
      priceType: state.priceType,
      priceValueCents: perSackCents,
      priceCurrency: state.priceCurrency,
      advancePct: state.barterEnabled && state.advancePct ? Number(state.advancePct) : undefined,
      barterDescription: state.barterEnabled ? state.barterDescription || undefined : undefined,
      warehouseName: state.warehouseName,
      warehouseAddress: {
        street: state.warehouseStreet || undefined,
        city: state.warehouseCity,
        state: state.warehouseState,
      },
      deliveryDeadline: state.deliveryDeadline,
      transportResponsible: state.transportResponsible,
      penaltyPct: Number(state.penaltyPct || 10),
      hasWashoutClause: state.hasWashoutClause,
      hasForceMajeure: state.hasForceMajeure,
      arbitrationForum: state.arbitrationForum || undefined,
    };
  }

  async function onCreate(): Promise<void> {
    setError(null);
    setSubmitting(true);
    const res = await createContract(buildPayload());
    setSubmitting(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Erro ao criar contrato.');
      return;
    }
    localStorage.removeItem(DRAFT_KEY);
    router.push(`/contracts/${res.data.id}`);
    router.refresh();
  }

  const tons = state.quantitySacks ? sacksToTons(Number(state.quantitySacks)) : 0;
  const totalReais =
    state.priceType === 'fixo' && state.pricePerSackReais && state.quantitySacks
      ? Number(state.pricePerSackReais) * Number(state.quantitySacks)
      : 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <main className="container max-w-2xl py-8">
        <Link
          href="/contracts"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar para contratos
        </Link>
        <h1 className="text-2xl font-semibold">Novo contrato</h1>

        {restored ? (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
            <History className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="flex-1">Retomamos o rascunho de onde você parou.</span>
            <button
              type="button"
              onClick={discardDraft}
              className="font-medium text-primary hover:underline"
            >
              Começar do zero
            </button>
          </p>
        ) : null}

        {/* Barra de progresso */}
        <div className="mt-6 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-1">
              <div className={`h-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
              <span className={`text-xs ${i === step ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border bg-card p-6">
          {step === 0 && <PartiesStep state={state} set={set} />}
          {step === 1 && (
            <ObjectStep state={state} set={set} onGrainChange={onGrainChange} tons={tons} />
          )}
          {step === 2 && <PriceStep state={state} set={set} total={totalReais} />}
          {step === 3 && <DeliveryStep state={state} set={set} />}
          {step === 4 && <ReviewStep state={state} tons={tons} total={totalReais} />}

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={back} disabled={step === 0 || submitting}>
              Voltar
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>Próximo</Button>
            ) : (
              <Button onClick={onCreate} disabled={submitting}>
                {submitting ? 'Criando...' : 'Criar contrato'}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
