import { PlantorLogo } from "@/components/PlantorLogo";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <PlantorLogo />
      <p className="text-neutral-500">Reconstrução em andamento (M0 — scaffolding).</p>
    </main>
  );
}
