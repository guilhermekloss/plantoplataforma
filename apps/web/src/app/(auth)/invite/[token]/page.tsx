import { PlantorLogo } from "@/components/PlantorLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInviteAction } from "./actions";

/** Só pra prefill do e-mail na UI — a verificação real da assinatura é feita na API. */
function decodeInviteEmail(token: string): string | null {
  try {
    const payloadBase64 = token.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export default function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { error?: string };
}) {
  const email = decodeInviteEmail(params.token);
  const acceptWithToken = acceptInviteAction.bind(null, params.token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <PlantorLogo />
          <CardTitle className="mt-2">Aceitar convite</CardTitle>
        </CardHeader>
        <CardContent>
          {!email ? (
            <p className="text-sm text-red-600">Convite inválido ou expirado.</p>
          ) : (
            <form action={acceptWithToken} className="flex flex-col gap-4">
              <input type="hidden" name="email" value={email} />
              <div className="flex flex-col gap-1.5">
                <Label>E-mail</Label>
                <Input value={email} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" required autoComplete="name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Crie uma senha</Label>
                <Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
              </div>
              {searchParams.error && (
                <p className="text-sm text-red-600">Não foi possível aceitar o convite. Tente novamente.</p>
              )}
              <Button type="submit" className="mt-2">
                Criar conta
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
