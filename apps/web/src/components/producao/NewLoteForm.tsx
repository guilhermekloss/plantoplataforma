"use client";

import { useState, useTransition } from "react";
import type { Crop } from "@plantor/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLoteAction } from "@/server-actions/lotes";

const CROP_LABELS: Record<Crop, string> = { SOJA: "Soja", MILHO: "Milho", TRIGO: "Trigo" };

export function NewLoteForm() {
  const [crop, setCrop] = useState<Crop>("SOJA");
  const [season, setSeason] = useState("2025/26");
  const [alqueires, setAlqueires] = useState<number>(10);
  const [sacas, setSacas] = useState<number>(0);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await createLoteAction({
        crop,
        season,
        areaHectares: alqueires * 2.42,
        quantityKg: Math.round(sacas * 60),
      });
      setSacas(0);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo lote</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Safra</Label>
            <Input value={season} onChange={(e) => setSeason(e.target.value)} className="w-24" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Área (alqueires)</Label>
            <Input
              type="number"
              min={0}
              value={alqueires || ""}
              onChange={(e) => setAlqueires(Number(e.target.value))}
              className="w-24"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Quantidade (sc)</Label>
            <Input type="number" min={0} value={sacas || ""} onChange={(e) => setSacas(Number(e.target.value))} className="w-24" />
          </div>
        </div>
        <Button size="sm" className="w-fit" disabled={pending || sacas <= 0} onClick={submit}>
          {pending ? "Criando..." : "Criar lote"}
        </Button>
      </CardContent>
    </Card>
  );
}
