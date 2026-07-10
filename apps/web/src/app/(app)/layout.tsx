import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { PlantorLogo } from "@/components/PlantorLogo";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <Link href="/dashboard">
          <PlantorLogo />
        </Link>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          {session && (
            <span>
              {session.user.name} · {session.user.organizationName}
            </span>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
