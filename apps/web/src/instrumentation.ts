// next.config.mjs não pode importar .ts, então a validação de env roda aqui
// (hook padrão do Next.js, executado uma vez na inicialização do servidor).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateWebEnv } = await import("./lib/env");
    validateWebEnv();
  }
}
