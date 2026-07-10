"use client";

import { useState, useTransition } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assistantAction } from "@/server-actions/ai";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Oi! Pode me perguntar sobre seus contratos na Plantor." },
  ]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();

  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");

    startTransition(async () => {
      const result = await assistantAction(text);
      setMessages((prev) => [...prev, { role: "assistant", text: result.reply }]);
    });
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-md flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={18} className="text-terracota-500" />
        <h1 className="text-lg font-semibold text-neutral-900">Assistente</h1>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-md border border-neutral-200 bg-white p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user" ? "ml-auto bg-terracota-500 text-white" : "bg-neutral-100 text-neutral-800"
            }`}
          >
            {m.text}
          </div>
        ))}
        {pending && <div className="max-w-[85%] rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-500">Pensando...</div>}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Digite sua pergunta..."
        />
        <Button onClick={send} disabled={pending || !input.trim()}>
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
