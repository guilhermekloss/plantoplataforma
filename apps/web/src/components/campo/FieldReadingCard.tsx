import { Card } from "@/components/ui/card";
import type { FieldReadingItem } from "@/lib/types";

export function FieldReadingCard({ reading }: { reading: FieldReadingItem }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-neutral-900">
          {reading.crop} · {reading.season}
        </p>
        <p className="text-xs text-neutral-500">{new Date(reading.readingDate).toLocaleDateString("pt-BR")}</p>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-600 sm:grid-cols-3">
        {reading.yieldScHa != null && <Item label="Produtividade" value={`${reading.yieldScHa} sc/ha`} />}
        {reading.harvestMoisture != null && <Item label="Umidade colheita" value={`${reading.harvestMoisture}%`} />}
        {reading.ndvi != null && <Item label="NDVI" value={reading.ndvi.toString()} />}
        {reading.plantPopulation != null && <Item label="População" value={`${reading.plantPopulation} pl/ha`} />}
        {reading.rainfallMm != null && <Item label="Chuva no ciclo" value={`${reading.rainfallMm} mm`} />}
        {reading.gddAccumulated != null && <Item label="GDD acumulado" value={reading.gddAccumulated.toString()} />}
        {reading.avgTempC != null && <Item label="Temp. média" value={`${reading.avgTempC}°C`} />}
        {reading.frostEvents != null && <Item label="Geadas" value={String(reading.frostEvents)} />}
      </dl>
      {reading.estimatedRevenuePerHectareCents != null && (
        <p className="mt-2 text-sm text-terracota-600">
          Estimativa: {(reading.estimatedRevenuePerHectareCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/ha
        </p>
      )}
    </Card>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
