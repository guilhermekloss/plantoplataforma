/**
 * Hook de startup do Next.js (experimental.instrumentationHook).
 * Valida as variáveis de ambiente assim que o servidor sobe — falha cedo.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./env');
  }
}
