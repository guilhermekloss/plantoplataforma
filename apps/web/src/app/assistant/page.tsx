import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AppHeader } from '@/components/app-header';
import { AssistantChat } from '@/components/assistant-chat';

export default async function AssistantPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader name={session.user.name} orgType={session.user.organizationType} />
      <main className="container flex w-full max-w-3xl flex-1 animate-fade-up flex-col py-6 lg:max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight">Assistente</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Sua assistente para entender contratos e entregas.
        </p>
        <AssistantChat />
      </main>
    </div>
  );
}
