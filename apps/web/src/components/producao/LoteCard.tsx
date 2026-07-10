"use client";

import { useState, useTransition } from "react";
import type { LoteStatus } from "@plantor/shared";
// Deep import (não o barrel "@plantor/shared") pra não puxar hash.ts
// (node:crypto) pro bundle do navegador.
import { LOTE_TRANSITIONS } from "@plantor/shared/dist/lote-state-machine";
import { kgToSacas } from "@plantor/shared/dist/units";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoteItem } from "@/lib/types";
import { createOfferAction } from "@/server-actions/offers";
import { updateLoteStatusAction } from "@/server-actions/lotes";
import { LoteStatusBadge } from "./LoteStatusBadge";

const STATUS_LABELS: Record<LoteStatus, string> = {
  PLANTADO: "Plantado",
  COLHIDO: "Colhido",
  BENEFICIAMENTO: "Beneficiamento",
  DISPONIVEL: "Disponível",
  OFERTADO: "Ofertado",
  VENDIDO: "Vendido",
};

export function LoteCard({ lote }: { lote: LoteItem }) {
  const [pending, startTransition] = useTransition();
  const [priceReais, setPriceReais] = useState<number>(0);
  const nextStatuses = LOTE_TRANSITIONS[lote.status].filter((s: LoteStatus) => s !== "OFERTADO" && s !== "VENDIDO");

  function advance(status: LoteStatus) {
    startTransition(async () => {
      await updateLoteStatusAction(lote.id, status);
    });
  }

  function offer() {
    startTransition(async () => {
      await createOfferAction(lote.id, priceReais > 0 ? Math.round(priceReais * 100) : undefined);
    });
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-neutral-900">
          {lote.crop} · {lote.season}
        </p>
        <LoteStatusBadge status={lote.status} />
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        {lote.areaHectares.toLocaleString("pt-BR")} ha · {kgToSacas(lote.quantityKg).toLocaleString("pt-BR")} sc
      </p>

      {lote.status === "DISPONIVEL" ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Preço esperado (R$/sc, opcional)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={priceReais || ""}
              onChange={(e) => setPriceReais(Number(e.target.value))}
              className="w-32"
            />
          </div>
          <Button size="sm" disabled={pending} onClick={offer}>
            {pending ? "Ofertando..." : "Disponibilizar para venda"}
          </Button>
        </div>
      ) : (
        nextStatuses.length > 0 && (
          <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
            {nextStatuses.map((status: LoteStatus) => (
              <Button key={status} size="sm" variant="outline" disabled={pending} onClick={() => advance(status)}>
                {pending ? "..." : `Marcar como ${STATUS_LABELS[status]}`}
              </Button>
            ))}
          </div>
        )
      )}
    </Card>
  );
}
