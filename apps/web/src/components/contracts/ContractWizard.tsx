"use client";

import { useState, useTransition } from "react";
import type { Crop } from "@plantor/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrganizationSummary } from "@/lib/types";
import { createContractAction, searchOrganizationsAction } from "@/server-actions/contracts";

const CROP_LABELS: Record<Crop, string> = { SOJA: "Soja", MILHO: "Milho", TRIGO: "Trigo" };
const STEPS = ["Produtor", "Cultura", "Quantidade e preço", "Prazo de entrega", "Revisão"] as const;

export function ContractWizard() {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [sellerQuery, setSellerQuery] = useState("");
  const [sellerResults, setSellerResults] = useState<OrganizationSummary[]>([]);
  const [seller, setSeller] = useState<OrganizationSummary | null>(null);
  const [crop, setCrop] = useState<Crop>("SOJA");
  const [sacas, setSacas] = useState<number>(0);
  const [pricePerSacaReais, setPricePerSacaReais] = useState<number>(0);
  const [deliveryDeadline, setDeliveryDeadline] = useState("");

  async function handleSearchSeller(query: string) {
    setSellerQuery(query);
    if (query.length < 2) {
      setSellerResults([]);
      return;
    }
    const results = await searchOrganizationsAction("PRODUCER", query);
    setSellerResults(results);
  }

  const quantityKg = Math.round(sacas * 60);
  const pricePerSc60Cents = Math.round(pricePerSacaReais * 100);
  const totalValueReais = ((quantityKg / 60) * pricePerSc60Cents) / 100;

  const canAdvance = [
    Boolean(seller),
    Boolean(crop),
    sacas > 0 && pricePerSacaReais > 0,
    Boolean(deliveryDeadline),
    true,
  ][step];

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await createContractAction({
          sellerOrgId: seller!.id,
          crop,
          quantityKg,
          pricePerSc60Cents,
          deliveryDeadline: new Date(deliveryDeadline).toISOString(),
        });
      } catch (e) {
        if (e instanceof Error && !e.message.startsWith("NEXT_REDIRECT")) {
          setError("Não foi possível criar o contrato. Tente novamente.");
        }
      }
    });
  }

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Novo contrato</CardTitle>
        <p className="text-sm text-neutral-500">
          Etapa {step + 1} de {STEPS.length}: {STEPS[step]}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {step === 0 && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="seller-search">Buscar produtor</Label>
            <Input
              id="seller-search"
              value={sellerQuery}
              onChange={(e) => handleSearchSeller(e.target.value)}
              placeholder="Nome da fazenda/produtor"
            />
            <ul className="flex flex-col gap-1">
              {sellerResults.map((org) => (
                <li key={org.id}>
                  <button
                    type="button"
                    onClick={() => setSeller(org)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                      seller?.id === org.id ? "border-terracota-500 bg-terracota-50" : "border-neutral-200"
                    }`}
                  >
                    {org.name} {org.city ? `— ${org.city}/${org.state}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-2">
            <Label>Cultura</Label>
            <div className="flex gap-2">
              {(Object.keys(CROP_LABELS) as Crop[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCrop(c)}
                  className={`rounded-md border px-4 py-2 text-sm ${
                    crop === c ? "border-terracota-500 bg-terracota-50" : "border-neutral-200"
                  }`}
                >
                  {CROP_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sacas">Quantidade (sacas de 60kg)</Label>
              <Input
                id="sacas"
                type="number"
                min={1}
                value={sacas || ""}
                onChange={(e) => setSacas(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="preco">Preço por saca (R$)</Label>
              <Input
                id="preco"
                type="number"
                min={0.01}
                step="0.01"
                value={pricePerSacaReais || ""}
                onChange={(e) => setPricePerSacaReais(Number(e.target.value))}
              />
            </div>
            {sacas > 0 && pricePerSacaReais > 0 && (
              <p className="text-sm text-neutral-600">
                Total: <strong>R$ {totalValueReais.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deadline">Prazo de entrega</Label>
            <Input
              id="deadline"
              type="date"
              value={deliveryDeadline}
              onChange={(e) => setDeliveryDeadline(e.target.value)}
            />
          </div>
        )}

        {step === 4 && (
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Produtor" value={seller?.name ?? "—"} />
            <Row label="Cultura" value={CROP_LABELS[crop]} />
            <Row label="Quantidade" value={`${sacas.toLocaleString("pt-BR")} sc`} />
            <Row label="Preço/sc" value={`R$ ${pricePerSacaReais.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
            <Row label="Valor total" value={`R$ ${totalValueReais.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
            <Row label="Prazo de entrega" value={deliveryDeadline || "—"} />
          </dl>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-between">
          <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>
              Avançar
            </Button>
          ) : (
            <Button type="button" disabled={pending} onClick={submit}>
              {pending ? "Criando..." : "Criar contrato"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-neutral-100 pb-1">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-900">{value}</dd>
    </div>
  );
}
