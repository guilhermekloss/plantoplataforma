import Link from "next/link";
import { kgToSacas } from "@plantor/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { StatusBadge } from "@/components/contracts/StatusBadge";
import { getDashboardSummaryAction } from "@/server-actions/dashboard";
import { auth } from "@/lib/auth";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function DashboardPage() {
  const [summary, session] = await Promise.all([getDashboardSummaryAction(), auth()]);
  const isProducer = session?.user.organizationType === "PRODUCER";

  if (isProducer) {
    return <ProducerDashboard summary={summary} />;
  }
  return <CooperativeDashboard summary={summary} />;
}

function CooperativeDashboard({ summary }: { summary: Awaited<ReturnType<typeof getDashboardSummaryAction>> }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Painel</h1>
        <Link href="/mercado">
          <Button variant="outline">Mercado</Button>
        </Link>
      </div>

      <KpiCards
        items={[
          { label: "Contratos", value: String(summary.totalContracts) },
          { label: "Valor total", value: formatBRL(summary.totalValueCents) },
          { label: "Assinados", value: String(summary.byStatus.ASSINADO) },
          { label: "Pendentes de assinatura", value: String(summary.byStatus.PENDENTE_ASSINATURA) },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contratos por status</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart byStatus={summary.byStatus} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prazos próximos</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertsList contracts={summary.upcomingDeadlines} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contratos recentes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {summary.recentContracts.map((c) => (
            <Link
              key={c.id}
              href={`/contracts/${c.id}`}
              className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-neutral-50"
            >
              <span className="text-sm">
                {c.number} · {c.counterpartyName}
              </span>
              <StatusBadge status={c.status} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ProducerDashboard({ summary }: { summary: Awaited<ReturnType<typeof getDashboardSummaryAction>> }) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Meus contratos</h1>

      <Card className="p-4">
        <p className="text-xs text-neutral-500">Valor total em contratos</p>
        <p className="mt-1 text-2xl font-semibold text-terracota-600">{formatBRL(summary.totalValueCents)}</p>
        <p className="mt-1 text-xs text-neutral-500">{summary.totalContracts} contrato(s)</p>
      </Card>

      {summary.upcomingDeadlines.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-700">Prazos próximos</h2>
          <AlertsList contracts={summary.upcomingDeadlines} />
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-700">Contratos recentes</h2>
        <div className="flex flex-col gap-2">
          {summary.recentContracts.map((c) => (
            <Link key={c.id} href={`/contracts/${c.id}`}>
              <Card className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{c.number}</p>
                  <p className="text-xs text-neutral-500">
                    {c.crop} · {kgToSacas(c.quantityKg).toLocaleString("pt-BR")} sc
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Link href="/contracts">
        <Button variant="outline" className="w-full">
          Ver todos os contratos
        </Button>
      </Link>
      <Link href="/producao">
        <Button variant="outline" className="w-full">
          Minha produção
        </Button>
      </Link>
      <Link href="/campo">
        <Button variant="outline" className="w-full">
          Ver dados de campo
        </Button>
      </Link>
      <Link href="/assistant">
        <Button variant="outline" className="w-full">
          Falar com o assistente
        </Button>
      </Link>
    </div>
  );
}
