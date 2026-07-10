import { kgToSacas } from "@plantor/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/contracts/StatusBadge";
import { ContractTimeline } from "@/components/contracts/ContractTimeline";
import { SignButton } from "@/components/contracts/SignButton";
import { DeliveriesSection } from "@/components/deliveries/DeliveriesSection";
import { ContractExplainer } from "@/components/contracts/ContractExplainer";
import { AgronomicSection } from "@/components/contracts/AgronomicSection";
import { getContractAction } from "@/server-actions/contracts";
import { auth } from "@/lib/auth";

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const [contract, session] = await Promise.all([getContractAction(params.id), auth()]);

  const isBuyer = session?.user.organizationId === contract.buyerOrg.id;
  const alreadySigned = isBuyer ? contract.signedByBuyerAt : contract.signedBySellerAt;
  const canSign = contract.status === "PENDENTE_ASSINATURA" && !alreadySigned;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{contract.number}</CardTitle>
              <p className="text-sm text-neutral-500">
                {contract.buyerOrg.name} → {contract.sellerOrg.name}
              </p>
            </div>
            <StatusBadge status={contract.status} />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Cultura" value={contract.crop} />
              <Field label="Quantidade" value={`${kgToSacas(contract.quantityKg).toLocaleString("pt-BR")} sc`} />
              <Field
                label="Preço/sc"
                value={`R$ ${(contract.pricePerSc60Cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              />
              <Field
                label="Valor total"
                value={`R$ ${(contract.totalValueCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              />
              <Field label="Prazo de entrega" value={new Date(contract.deliveryDeadline).toLocaleDateString("pt-BR")} />
              {contract.contractHash && <Field label="Hash de assinatura" value={contract.contractHash} mono />}
            </dl>

            <ContractExplainer contractId={contract.id} />

            {canSign && <SignButton contractId={contract.id} />}
          </CardContent>
        </Card>

        <AgronomicSection agronomicData={contract.agronomicData} />

        {(contract.status === "ASSINADO" || contract.status === "ENTREGA_PARCIAL" || contract.status === "LIQUIDADO") && (
          <DeliveriesSection
            contractId={contract.id}
            contractStatus={contract.status}
            contractQuantityKg={contract.quantityKg}
            pricePerSc60Cents={contract.pricePerSc60Cents}
            deliveries={contract.deliveries}
            isBuyer={isBuyer}
          />
        )}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          <ContractTimeline events={contract.events} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd className={`font-medium text-neutral-900 ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
