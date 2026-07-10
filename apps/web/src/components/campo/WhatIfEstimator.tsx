"use client";

import { useState } from "react";
import type { Crop } from "@plantor/shared";
// Import direto do submódulo (não do barrel "@plantor/shared") pra não
// puxar hash.ts (node:crypto) pro bundle do navegador.
import { estimateGrossValueCents, alqueiresToHectares } from "@plantor/shared/dist/agronomy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CROP_LABELS: Record<Crop, string> = { SOJA: "Soja", MILHO: "Milho", TRIGO: "Trigo" };

export function WhatIfEstimator({ defaultCrop, defaultYieldScHa }: { defaultCrop: Crop; defaultYieldScHa: number }) {
  const [crop, setCrop] = useState<Crop>(defaultCrop);
  const [yieldScHa, setYieldScHa] = useState<number>(defaultYieldScHa);
  const [alqueires, setAlqueires] = useState<number>(10);

  const areaHectares = alqueiresToHectares(alqueires);
  const estimateCents = estimateGrossValueCents(crop, yieldScHa, areaHectares);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulador: quanto eu recebo?</CardTitle>
        <p className="text-xs text-neutral-500">Preço de referência indicativo — não é cotação real.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Cultura</Label>
            <div className="flex gap-1.5">
              {(Object.keys(CROP_LABELS) as Crop[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCrop(c)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    crop === c ? "border-terracota-500 bg-terracota-50" : "border-neutral-200"
                  }`}
                >
                  {CROP_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Produtividade (sc/ha)</Label>
            <Input
              type="number"
              min={0}
              value={yieldScHa || ""}
              onChange={(e) => setYieldScHa(Number(e.target.value))}
              className="w-28"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Área (alqueires)</Label>
            <Input
              type="number"
              min={0}
              value={alqueires || ""}
              onChange={(e) => setAlqueires(Number(e.target.value))}
              className="w-28"
            />
          </div>
        </div>

        <p className="text-sm text-neutral-600">
          {areaHectares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha · Receita estimada:{" "}
          <strong className="text-terracota-600">
            {(estimateCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </strong>
        </p>
      </CardContent>
    </Card>
  );
}
