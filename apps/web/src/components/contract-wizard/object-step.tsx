'use client';

import { GRAIN_TYPES, HARVEST_PERIODS, type GrainType } from '@plantor/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GRAIN_LABELS } from '@/lib/contracts';
import { NumField } from '@/components/contract-wizard/num-field';
import {
  ADJ_OPTIONS,
  PERIOD_LABELS,
  type StepProps,
  type WizardState,
} from '@/components/contract-wizard/wizard-state';

export function ObjectStep({
  state,
  set,
  onGrainChange,
  tons,
}: StepProps & { onGrainChange: (g: GrainType) => void; tons: number }): React.ReactElement {
  return (
    <div className="space-y-4">
      <h2 className="font-medium">Objeto do contrato</h2>
      <div className="space-y-2">
        <Label htmlFor="grain">Grão</Label>
        <select
          id="grain"
          value={state.grainType}
          onChange={(e) => onGrainChange(e.target.value as GrainType)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {GRAIN_TYPES.map((g) => (
            <option key={g} value={g}>
              {GRAIN_LABELS[g].label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="qty">Quantidade (sacas)</Label>
        <Input
          id="qty"
          type="number"
          min={1}
          value={state.quantitySacks}
          onChange={(e) => set('quantitySacks', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">≈ {tons.toLocaleString('pt-BR')} toneladas</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="harvest">Safra</Label>
          <Input
            id="harvest"
            value={state.harvestYear}
            onChange={(e) => set('harvestYear', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="period">Período</Label>
          <select
            id="period"
            value={state.harvestPeriod}
            onChange={(e) => set('harvestPeriod', e.target.value as WizardState['harvestPeriod'])}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {HARVEST_PERIODS.map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <h3 className="pt-2 text-sm font-medium">Padrões de qualidade (MAPA — Tipo 1, editáveis)</h3>
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Umidade máx (%)" value={state.maxMoisturePct} onChange={(v) => set('maxMoisturePct', v)} />
        <NumField label="Impurezas máx (%)" value={state.maxImpurityPct} onChange={(v) => set('maxImpurityPct', v)} />
        <NumField label="PH mín (g/L)" value={state.minSpecificWeightGL} onChange={(v) => set('minSpecificWeightGL', v)} />
        <NumField label="Avariados máx (%)" value={state.maxDamagedPct} onChange={(v) => set('maxDamagedPct', v)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adj">Ajuste por não conformidade</Label>
        <select
          id="adj"
          value={state.qualityAdjType}
          onChange={(e) => set('qualityAdjType', e.target.value as WizardState['qualityAdjType'])}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {ADJ_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
