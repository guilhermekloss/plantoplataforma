"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { explainContractAction } from "@/server-actions/ai";

export function ContractExplainer({ contractId }: { contractId: string }) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function explain() {
    startTransition(async () => {
      const result = await explainContractAction(contractId);
      setExplanation(result.explanation);
    });
  }

  if (explanation) {
    return (
      <div className="rounded-md border border-terracota-200 bg-terracota-50 p-3 text-sm text-neutral-800">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-terracota-700">
          <Sparkles size={14} /> Explicação em linguagem simples
        </p>
        {explanation}
      </div>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={explain}>
      <Sparkles size={14} className="mr-1.5" />
      {pending ? "Gerando explicação..." : "Explicar este contrato"}
    </Button>
  );
}
