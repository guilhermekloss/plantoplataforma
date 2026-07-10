import { auth } from "@/lib/auth";
import { AssistantChat } from "@/components/AssistantChat";

export default async function AssistantPage() {
  const session = await auth();

  if (session?.user.role !== "PRODUCER") {
    return (
      <p className="mx-auto max-w-md text-center text-sm text-neutral-500">
        O assistente de IA está disponível apenas para produtores.
      </p>
    );
  }

  return <AssistantChat />;
}
