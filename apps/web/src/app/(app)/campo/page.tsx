import { auth } from "@/lib/auth";
import { getFieldDataOverviewAction } from "@/server-actions/field-data";
import { FieldReadingCard } from "@/components/campo/FieldReadingCard";
import { WhatIfEstimator } from "@/components/campo/WhatIfEstimator";

export default async function CampoPage() {
  const session = await auth();

  if (session?.user.role !== "PRODUCER") {
    return (
      <p className="mx-auto max-w-md text-center text-sm text-neutral-500">
        Dados de campo estão disponíveis apenas para produtores.
      </p>
    );
  }

  const { readings } = await getFieldDataOverviewAction();
  const latest = readings[0];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Campo</h1>

      <WhatIfEstimator defaultCrop={latest?.crop ?? "SOJA"} defaultYieldScHa={latest?.yieldScHa ?? 60} />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-700">Leituras registradas</h2>
        {readings.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma leitura de campo registrada ainda.</p>
        ) : (
          readings.map((reading) => <FieldReadingCard key={reading.id} reading={reading} />)
        )}
      </div>
    </div>
  );
}
