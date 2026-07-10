"use client";

import { useState, useTransition } from "react";
// Import direto do submódulo (não do barrel "@plantor/shared") para não
// puxar hash.ts (node:crypto) para o bundle do navegador — quebra o build
// do Next.js com "node:crypto" module scheme not handled.
import { kgToSacas } from "@plantor/shared/dist/units";
import type { ContractStatus } from "@plantor/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DeliveryItem } from "@/lib/types";
import { addQualityReportAction, registerDeliveryAction, releasePaymentAction } from "@/server-actions/deliveries";

export interface DeliveriesSectionProps {
  contractId: string;
  contractStatus: ContractStatus;
  contractQuantityKg: number;
  pricePerSc60Cents: number;
  deliveries: DeliveryItem[];
  isBuyer: boolean;
}

export function DeliveriesSection({
  contractId,
  contractStatus,
  contractQuantityKg,
  pricePerSc60Cents,
  deliveries,
  isBuyer,
}: DeliveriesSectionProps) {
  const deliveredKg = deliveries.reduce((sum, d) => sum + d.quantityKg, 0);
  const progressPct = Math.min(100, Math.round((deliveredKg / contractQuantityKg) * 100));
  const canRegisterDelivery = isBuyer && (contractStatus === "ASSINADO" || contractStatus === "ENTREGA_PARCIAL");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entregas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full bg-terracota-500" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {kgToSacas(deliveredKg).toLocaleString("pt-BR")} de {kgToSacas(contractQuantityKg).toLocaleString("pt-BR")} sc
            entregues ({progressPct}%)
          </p>
        </div>

        {canRegisterDelivery && <RegisterDeliveryForm contractId={contractId} />}

        <div className="flex flex-col gap-3">
          {deliveries.map((delivery) => (
            <DeliveryCard
              key={delivery.id}
              contractId={contractId}
              delivery={delivery}
              pricePerSc60Cents={pricePerSc60Cents}
              isBuyer={isBuyer}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RegisterDeliveryForm({ contractId }: { contractId: string }) {
  const [sacas, setSacas] = useState<number>(0);
  const [deliveredAt, setDeliveredAt] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await registerDeliveryAction({
          contractId,
          quantityKg: Math.round(sacas * 60),
          deliveredAt: new Date(deliveredAt).toISOString(),
        });
        setSacas(0);
        setDeliveredAt("");
      } catch {
        setError("Não foi possível registrar a entrega.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 p-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="delivery-sacas">Quantidade (sc)</Label>
        <Input
          id="delivery-sacas"
          type="number"
          min={1}
          value={sacas || ""}
          onChange={(e) => setSacas(Number(e.target.value))}
          className="w-32"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="delivery-date">Data</Label>
        <Input id="delivery-date" type="date" value={deliveredAt} onChange={(e) => setDeliveredAt(e.target.value)} />
      </div>
      <Button disabled={pending || sacas <= 0 || !deliveredAt} onClick={submit} size="sm">
        {pending ? "Registrando..." : "Registrar entrega"}
      </Button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}

function DeliveryCard({
  contractId,
  delivery,
  pricePerSc60Cents,
  isBuyer,
}: {
  contractId: string;
  delivery: DeliveryItem;
  pricePerSc60Cents: number;
  isBuyer: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function releasePayment() {
    startTransition(async () => {
      await releasePaymentAction(contractId, delivery.id);
    });
  }

  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {kgToSacas(delivery.quantityKg).toLocaleString("pt-BR")} sc · {new Date(delivery.deliveredAt).toLocaleDateString("pt-BR")}
        </p>
        {delivery.paidAt ? (
          <span className="text-xs font-medium text-green-600">Pagamento liberado</span>
        ) : (
          isBuyer && (
            <Button size="sm" variant="outline" disabled={pending} onClick={releasePayment}>
              {pending ? "Liberando..." : "Liberar pagamento"}
            </Button>
          )
        )}
      </div>

      {delivery.qualityReport ? (
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-600 sm:grid-cols-4">
          <span>Umidade: {delivery.qualityReport.moisturePct}%</span>
          <span>Impurezas: {delivery.qualityReport.impuritiesPct}%</span>
          <span>Quebrados: {delivery.qualityReport.brokenGrainsPct}%</span>
          <span>
            Classe {delivery.qualityReport.gradeClass} · desconto {delivery.qualityReport.discountPct}%
          </span>
        </dl>
      ) : (
        isBuyer && (
          <QualityReportForm contractId={contractId} deliveryId={delivery.id} deliveryQuantityKg={delivery.quantityKg} pricePerSc60Cents={pricePerSc60Cents} />
        )
      )}
    </div>
  );
}

// Preview client-side, só para UX — o cálculo autoritativo acontece no
// servidor (packages/shared/src/grading.ts). Duplicado aqui em vez de
// importado porque o pacote @plantor/shared também expõe hash.ts
// (node:crypto), que não deve entrar no bundle do navegador.
const BASELINE = { moisturePct: 14, impuritiesPct: 1, brokenGrainsPct: 8 };
function previewDiscountPct(m: number, i: number, b: number) {
  const excessMoisture = Math.max(0, m - BASELINE.moisturePct);
  const excessImpurities = Math.max(0, i - BASELINE.impuritiesPct);
  const excessBroken = Math.max(0, b - BASELINE.brokenGrainsPct);
  return Math.min(30, Math.round((excessMoisture * 1.5 + excessImpurities * 1.0 + excessBroken * 0.5) * 100) / 100);
}

function QualityReportForm({
  contractId,
  deliveryId,
  deliveryQuantityKg,
  pricePerSc60Cents,
}: {
  contractId: string;
  deliveryId: string;
  deliveryQuantityKg: number;
  pricePerSc60Cents: number;
}) {
  const [moisturePct, setMoisturePct] = useState<number>(14);
  const [impuritiesPct, setImpuritiesPct] = useState<number>(1);
  const [brokenGrainsPct, setBrokenGrainsPct] = useState<number>(8);
  const [pending, startTransition] = useTransition();

  const grossValueCents = Math.round((deliveryQuantityKg / 60) * pricePerSc60Cents);
  const previewPct = previewDiscountPct(moisturePct, impuritiesPct, brokenGrainsPct);
  const previewDiscountCents = Math.round((grossValueCents * previewPct) / 100);

  function submit() {
    startTransition(async () => {
      await addQualityReportAction(contractId, deliveryId, { moisturePct, impuritiesPct, brokenGrainsPct });
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-neutral-100 pt-3">
      <p className="text-xs font-medium text-neutral-700">Registrar laudo de qualidade</p>
      <div className="flex flex-wrap gap-3">
        <NumberField label="Umidade %" value={moisturePct} onChange={setMoisturePct} />
        <NumberField label="Impurezas %" value={impuritiesPct} onChange={setImpuritiesPct} />
        <NumberField label="Quebrados %" value={brokenGrainsPct} onChange={setBrokenGrainsPct} />
      </div>
      <p className="text-xs text-neutral-500">
        Desconto estimado: <strong>{previewPct}%</strong> (
        {(previewDiscountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})
      </p>
      <Button size="sm" disabled={pending} onClick={submit} className="w-fit">
        {pending ? "Salvando..." : "Salvar laudo"}
      </Button>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step="0.1"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24"
      />
    </div>
  );
}
