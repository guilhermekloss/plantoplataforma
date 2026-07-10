"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
// Deep import (não o barrel) pra não puxar hash.ts (node:crypto) pro
// bundle do navegador.
import { kgToSacas } from "@plantor/shared/dist/units";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OfferItem } from "@/lib/types";
import { generateContractAction } from "@/server-actions/offers";

export function OfferCard({ offer }: { offer: OfferItem }) {
  const router = useRouter();
  const [priceReais, setPriceReais] = useState<number>(offer.expectedPriceCents ? offer.expectedPriceCents / 100 : 0);
  const [deadline, setDeadline] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const contract = await generateContractAction(offer.id, {
          pricePerSc60Cents: Math.round(priceReais * 100),
          deliveryDeadline: new Date(deadline).toISOString(),
        });
        router.push(`/contracts/${contract.id}`);
      } catch {
        setError("Não foi possível gerar o contrato.");
      }
    });
  }

  return (
    <Card className="p-4">
      <p className="font-medium text-neutral-900">
        {offer.organization?.name} · {offer.crop}
      </p>
      <p className="text-sm text-neutral-500">
        {kgToSacas(offer.quantityKg).toLocaleString("pt-BR")} sc
        {offer.expectedPriceCents ? ` · esperado R$ ${(offer.expectedPriceCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/sc` : ""}
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-neutral-100 pt-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Preço/sc (R$)</Label>
          <Input
            type="number"
            min={0.01}
            step="0.01"
            value={priceReais || ""}
            onChange={(e) => setPriceReais(Number(e.target.value))}
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Prazo de entrega</Label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <Button size="sm" disabled={pending || priceReais <= 0 || !deadline} onClick={submit}>
          {pending ? "Gerando..." : "Gerar contrato"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
