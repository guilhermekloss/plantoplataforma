'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumField } from '@/components/contract-wizard/num-field';
import { todayISO, type StepProps, type WizardState } from '@/components/contract-wizard/wizard-state';

export function DeliveryStep({ state, set }: StepProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <h2 className="font-medium">Entrega e penalidades</h2>
      <div className="space-y-2">
        <Label htmlFor="wh">Nome do armazém</Label>
        <Input id="wh" value={state.warehouseName} onChange={(e) => set('warehouseName', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="street">Endereço</Label>
        <Input id="street" value={state.warehouseStreet} onChange={(e) => set('warehouseStreet', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" value={state.warehouseCity} onChange={(e) => set('warehouseCity', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="uf">UF</Label>
          <Input id="uf" maxLength={2} value={state.warehouseState} onChange={(e) => set('warehouseState', e.target.value.toUpperCase())} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="deadline">Data limite de entrega</Label>
          <Input
            id="deadline"
            type="date"
            min={todayISO}
            value={state.deliveryDeadline}
            onChange={(e) => set('deliveryDeadline', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transp">Responsável pelo frete</Label>
          <select
            id="transp"
            value={state.transportResponsible}
            onChange={(e) =>
              set('transportResponsible', e.target.value as WizardState['transportResponsible'])
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="seller">Produtor</option>
            <option value="buyer">Comprador</option>
          </select>
        </div>
      </div>
      <NumField label="Cláusula penal (% do total)" value={state.penaltyPct} onChange={(v) => set('penaltyPct', v)} />
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={state.hasWashoutClause} onChange={(e) => set('hasWashoutClause', e.target.checked)} />
          Cláusula wash out
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={state.hasForceMajeure} onChange={(e) => set('hasForceMajeure', e.target.checked)} />
          Força maior
        </label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="forum">Foro de arbitragem</Label>
        <Input id="forum" value={state.arbitrationForum} onChange={(e) => set('arbitrationForum', e.target.value)} />
      </div>
    </div>
  );
}
