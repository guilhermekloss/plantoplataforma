import { Sprout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AgronomicData {
  season?: string;
  yieldScHa?: number | null;
  harvestMoisture?: number | null;
  ndvi?: number | null;
  rainfallMm?: number | null;
  readingDate?: string;
}

export function AgronomicSection({ agronomicData }: { agronomicData: unknown }) {
  if (!agronomicData || typeof agronomicData !== "object") {
    return null;
  }
  const data = agronomicData as AgronomicData;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Sprout size={16} className="text-green-600" /> Dados de campo na criação do contrato
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {data.season && <Item label="Safra" value={data.season} />}
        {data.yieldScHa != null && <Item label="Produtividade" value={`${data.yieldScHa} sc/ha`} />}
        {data.harvestMoisture != null && <Item label="Umidade colheita" value={`${data.harvestMoisture}%`} />}
        {data.ndvi != null && <Item label="NDVI" value={String(data.ndvi)} />}
        {data.rainfallMm != null && <Item label="Chuva no ciclo" value={`${data.rainfallMm} mm`} />}
        {data.readingDate && <Item label="Leitura de" value={new Date(data.readingDate).toLocaleDateString("pt-BR")} />}
      </CardContent>
    </Card>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="text-neutral-800">{value}</dd>
    </div>
  );
}
