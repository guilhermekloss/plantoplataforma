import { PlantorLogo } from "@/components/PlantorLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <PlantorLogo />
          <CardTitle className="mt-2">Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            {searchParams.error && (
              <p className="text-sm text-red-600">E-mail ou senha inválidos.</p>
            )}
            <Button type="submit" className="mt-2">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
