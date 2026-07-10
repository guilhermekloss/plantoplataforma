"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signContractAction } from "@/server-actions/contracts";

export function SignButton({ contractId }: { contractId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() => startTransition(() => signContractAction(contractId))}
    >
      {pending ? "Assinando..." : "Assinar contrato"}
    </Button>
  );
}
