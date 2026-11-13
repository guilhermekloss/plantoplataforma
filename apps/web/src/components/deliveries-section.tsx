'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  calculatePriceAdjustment,
  classifyGrade,
  type GrainType,
  type QualityAdjType,
} from '@plantor/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney, type Delivery } from '@/lib/contracts';
import {
  addQualityReport,
  registerDelivery,
  releasePayment,
} from '@/app/contracts/delivery-actions';

const PAYMENT_LABEL: Record<Delivery['paymentStatus'], string> = {
  pendente: 'Pagamento pendente',
  liberado: 'Pagamento liberado',
  pago: 'Pago',
};

interface QualityParams {
  grainType: GrainType;
  maxMoisturePct: number;
  maxImpurityPct: number;
  minSpecificWeightGL: number | null;
  maxDamagedPct: number | null;
  qualityAdjType: QualityAdjType;
}

const todayISO = new Date().toISOString().slice(0, 10);

export function DeliveriesSection({
  contractId,
  totalSacks,
  pricePerSackCents,
  currency,
  quality,
  deliveries,
  isBuyer,
  contractActive,
}: {
  contractId: string;
  totalSacks: number;
  pricePerSackCents: number | null;
  currency: 'BRL' | 'USD';
  quality: QualityParams;
  deliveries: Delivery[];
  isBuyer: boolean;
  contractActive: boolean;
}): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const delivered = deliveries.reduce((s, d) => s + Number(d.quantitySacks), 0);
  const pct = totalSacks > 0 ? Math.min(100, Math.round((delivered / totalSacks) * 100)) : 0;

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void): void {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? 'Erro.');
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-muted-foreground">
            {delivered.toLocaleString('pt-BR')} de {totalSacks.toLocaleString('pt-BR')} sacas entregues
          </span>
          <span className="font-medium">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {isBuyer && contractActive ? (
        showNew ? (
          <NewDeliveryForm
            pending={pending}
            onCancel={() => setShowNew(false)}
            onSubmit={(input) =>
              run(() => registerDelivery(contractId, input), () => setShowNew(false))
            }
          />
        ) : (
          <Button size="sm" onClick={() => setShowNew(true)}>
            + Registrar entrega
          </Button>
        )
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {deliveries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma entrega registrada.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {deliveries.map((d) => (
            <DeliveryRow
              key={d.id}
              contractId={contractId}
              delivery={d}
              quality={quality}
              pricePerSackCents={pricePerSackCents}
              currency={currency}
              isBuyer={isBuyer}
              pending={pending}
              run={run}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DeliveryRow({
  contractId,
  delivery,
  quality,
  pricePerSackCents,
  currency,
  isBuyer,
  pending,
  run,
}: {
  contractId: string;
  delivery: Delivery;
  quality: QualityParams;
  pricePerSackCents: number | null;
  currency: 'BRL' | 'USD';
  isBuyer: boolean;
  pending: boolean;
  run: (action: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void) => void;
}): React.ReactElement {
  const [showReport, setShowReport] = useState(false);
  const report = delivery.qualityReport;

  return (
    <li className="p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {Number(delivery.quantitySacks).toLocaleString('pt-BR')} sacas ·{' '}
            {new Date(delivery.deliveryDate).toLocaleDateString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">
            {delivery.nfeKey ? `NFe ${delivery.nfeKey.slice(0, 6)}…` : 'sem NFe'} ·{' '}
            {PAYMENT_LABEL[delivery.paymentStatus]}
            {delivery.paymentAmountCents
              ? ` · ${formatMoney(delivery.paymentAmountCents, currency)}`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report ? (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
              Grade {report.grade} · desconto {Number(delivery.priceAdjustmentPct ?? 0).toFixed(2)}%
            </span>
          ) : isBuyer ? (
            <Button size="sm" variant="outline" onClick={() => setShowReport((s) => !s)}>
              Anexar laudo
            </Button>
          ) : null}
          {isBuyer && report && delivery.paymentStatus === 'pendente' ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => releasePayment(contractId, delivery.id))}
            >
              Liberar pagamento
            </Button>
          ) : null}
        </div>
      </div>

      {showReport && !report ? (
        <QualityReportForm
          quality={quality}
          quantitySacks={Number(delivery.quantitySacks)}
          pricePerSackCents={pricePerSackCents}
          currency={currency}
          pending={pending}
          onCancel={() => setShowReport(false)}
          onSubmit={(input) =>
            run(() => addQualityReport(contractId, delivery.id, input), () => setShowReport(false))
          }
        />
      ) : null}
    </li>
  );
}

function NewDeliveryForm({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    deliveryDate: string;
    quantitySacks: number;
    nfeKey?: string;
    warehouseReceiptNumber?: string;
  }) => void;
}): React.ReactElement {
  const [date, setDate] = useState(todayISO);
  const [qty, setQty] = useState('');
  const [nfe, setNfe] = useState('');
  const [receipt, setReceipt] = useState('');

  return (
    <div className="space-y-3 rounded-md border p-3">
      <h3 className="text-sm font-medium">Nova entrega</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="d-date">Data</Label>
          <Input id="d-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-qty">Quantidade (sacas)</Label>
          <Input id="d-qty" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="d-nfe">Chave NFe (44 dígitos)</Label>
          <Input id="d-nfe" value={nfe} onChange={(e) => setNfe(e.target.value)} maxLength={44} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-rec">Recibo do armazém</Label>
          <Input id="d-rec" value={receipt} onChange={(e) => setReceipt(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending || !qty || Number(qty) <= 0}
          onClick={() =>
            onSubmit({
              deliveryDate: date,
              quantitySacks: Number(qty),
              nfeKey: nfe || undefined,
              warehouseReceiptNumber: receipt || undefined,
            })
          }
        >
          Salvar entrega
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function QualityReportForm({
  quality,
  quantitySacks,
  pricePerSackCents,
  currency,
  pending,
  onCancel,
  onSubmit,
}: {
  quality: QualityParams;
  quantitySacks: number;
  pricePerSackCents: number | null;
  currency: 'BRL' | 'USD';
  pending: boolean;
  onCancel: () => void;
  onSubmit: (input: Record<string, unknown>) => void;
}): React.ReactElement {
  const [reportNumber, setReportNumber] = useState('');
  const [lab, setLab] = useState('');
  const [moisture, setMoisture] = useState(String(quality.maxMoisturePct));
  const [impurity, setImpurity] = useState(String(quality.maxImpurityPct));
  const [damaged, setDamaged] = useState(quality.maxDamagedPct != null ? String(quality.maxDamagedPct) : '');
  const [ph, setPh] = useState(quality.minSpecificWeightGL != null ? String(quality.minSpecificWeightGL) : '');

  // Preview ao vivo da grade e do desconto (mesma lógica do backend, via @plantor/shared).
  const grade = classifyGrade(quality.grainType, {
    moisturePct: Number(moisture) || 0,
    impurityPct: Number(impurity) || 0,
    damagedPct: Number(damaged) || 0,
    specificWeightGL: ph ? Number(ph) : null,
  });
  const discount = calculatePriceAdjustment(
    { maxMoisturePct: quality.maxMoisturePct, qualityAdjType: quality.qualityAdjType },
    { moisturePct: Number(moisture) || 0 },
  );
  const gross = pricePerSackCents != null ? pricePerSackCents * quantitySacks : 0;
  const net = gross * (1 - discount / 100);

  return (
    <div className="mt-3 space-y-3 rounded-md border bg-muted/20 p-3">
      <h3 className="text-sm font-medium">Laudo de classificação</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Número do laudo" value={reportNumber} onChange={setReportNumber} />
        <Field label="Laboratório" value={lab} onChange={setLab} />
        <NumField label="Umidade (%)" value={moisture} onChange={setMoisture} />
        <NumField label="Impurezas (%)" value={impurity} onChange={setImpurity} />
        <NumField label="Avariados (%)" value={damaged} onChange={setDamaged} />
        <NumField label="PH (g/L)" value={ph} onChange={setPh} />
      </div>

      <div className="rounded-md bg-background p-3 text-sm">
        <p>
          Grade calculada: <strong>{grade}</strong>
        </p>
        <p>
          Desconto: <strong>{discount.toFixed(2)}%</strong>
          {pricePerSackCents != null ? (
            <>
              {' '}
              · Valor líquido: <strong>{formatMoney(String(Math.round(net)), currency)}</strong>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending || !reportNumber || !lab}
          onClick={() =>
            onSubmit({
              reportNumber,
              laboratoryName: lab,
              reportDate: todayISO,
              moisturePct: Number(moisture),
              impurityPct: Number(impurity),
              damagedPct: damaged ? Number(damaged) : undefined,
              specificWeightGL: ph ? Number(ph) : undefined,
            })
          }
        >
          Confirmar laudo
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): React.ReactElement {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): React.ReactElement {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type="number" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
