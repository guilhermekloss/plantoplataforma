"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { suggestContractsAction } from "@/server-actions/ai";

export function SuggestOffers() {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function suggest() {
    startTransition(async () => {
      const result = await suggestContractsAction();
      setSuggestion(result.suggestion);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={suggest} className="w-fit">
        <Sparkles size={14} className="mr-1.5" />
        {pending ? "Pensando..." : "IA: o que devo ofertar agora?"}
      </Button>
      {suggestion && (
        <div className="whitespace-pre-line rounded-md border border-terracota-200 bg-terracota-50 p-3 text-sm text-neutral-800">
          {suggestion}
        </div>
      )}
    </div>
  );
}
