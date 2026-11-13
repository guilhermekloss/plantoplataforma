# Histórico de decisões — Plantor

Consolidado das notas de trabalho das sessões de desenvolvimento (jun–jul/2026).
As especificações de origem estão em [`docs/specs/`](specs/):

- [`guia-projeto.md`](specs/guia-projeto.md) — guia completo do projeto (negócio, domínio jurídico, modelo de dados, blockchain, integrações, regras de desenvolvimento).
- [`PROMPT_MVP.md`](specs/PROMPT_MVP.md) — prompt de implementação do MVP (stack, módulos 0–5, regras e checkpoints).
- [`pesquisa-mercado-comercializacao-digital-graos.md`](specs/pesquisa-mercado-comercializacao-digital-graos.md) — pesquisa de mercado.

## Linha do tempo do código

| Data | Evento |
|---|---|
| 2026-06-20 → 2026-07-04 | Implementação original (módulos 0–9), sem controle de versão. |
| 2026-07-05 | A pasta do projeto foi movida para outro diretório; o caminho antigo ficou só com resíduo de build. |
| 2026-07-10 | O código foi dado como perdido e **reconstruído de memória** (schema e telas diferentes). Essa versão foi o primeiro commit do GitHub — preservada na tag `reconstrucao-2026-07-10`. |
| 2026-11-13 | O original foi reencontrado e **restaurado como base** deste repositório (branch `restauracao-original`), com as melhorias úteis da reconstrução portadas. |

## Direção de produto

- **O valor está no produtor rural, não na cooperativa.** Cooperativas/tradings já vivem em SAP/Oracle; a UI delas pode ser funcional e simples. A experiência do produtor precisa ser excelente, mobile-first (375px) e facilitada por IA.
- **Os dados vêm das máquinas.** A plataforma parte da premissa de que dados de colheitadeira, plantadeira, drone e estações climáticas são coletados automaticamente; só o essencial é cadastrado à mão. O produtor não cadastra contrato: vê seus lotes (plantado → colhido → beneficiamento → disponível → ofertado → vendido), escolhe o que vender, e um agente de IA propõe ofertas. A cooperativa vê as ofertas no Mercado e gera o contrato com 1 clique.
- **Integrações simuladas de propósito no MVP.** Feeds de campo/mercado, IA sem chave e e-mail sem chave degradam graciosamente (providers simulados, fallback determinístico, log). Não construir integração real sem pedido explícito.
- **WhatsApp:** integração adiada, mas o canal fica evidente na UI (card "Alertas no WhatsApp · Em breve" no dashboard do produtor). Quando implementar, seguir o molde do `EmailService`. Alertas de campo carregam `action?: 'criar_oferta'` para ações de um toque.
- **Fora do roadmap por ora:** PDF da CPR, migração dos e-mails para React Email. Blockchain fica para a Fase 02; oráculos B3/CEPEA para a Fase 03.

## Decisões de arquitetura

1. **RLS:** middleware Prisma filtra só `TENANT_OWNED_MODELS` (hoje vazio). `Contract` usa a regra buyer/seller (`apps/api/src/prisma/contract-access.ts`). `Organization` não é filtrada (comprador busca produtores). O tenant vem sempre do JWT via CLS, nunca do client.
   - Se algum model entrar em `TENANT_OWNED_MODELS`, leituras cross-tenant legítimas precisam de `cls.exit(async () => { return await ... })` — com o `await` **dentro** do callback, porque as promises do Prisma são preguiçosas.
2. **Convite (magic link):** JWT stateless (TTL 24h), sem tabela `Invite`.
3. **Validação:** Zod em tudo (`ZodValidationPipe`), não class-validator.
4. **Testes:** unit (`vitest.config.ts`, sem DB) separados de e2e (`vitest.e2e.config.ts`, Postgres real, sem mock de banco). O e2e usa `unplugin-swc` porque o esbuild do Vitest não emite `emitDecoratorMetadata`. O e2e roda num banco separado (`plantor_test`) com guarda que aborta se a URL não for de teste.
5. **`@plantor/shared` é CommonJS** (sem `type: module`), para a API conseguir fazer `require()`. Precisa estar buildado (`dist`) antes da API; há um smoke test CJS.
6. **Next.js 14** (App Router), validação de env via `instrumentation.ts`. NextAuth v5 exige `trustHost: true`.
7. **tenantId == organization.id** no MVP.

## Design system (web)

- Grão → `GrainChip`/`GrainIcon` (nunca emoji). KPI → `KpiCard` com `formatMoneyCompact`/`formatSacksCompact` (valor completo no `title`). Página → `animate-fade-up`. Ícones sempre `lucide-react`.
- Layout: listagem/dashboard (Painel, Meu campo, Produção, Assistente) usam zona principal + `aside` em `lg:grid-cols-3`; Contratos e Mercado usam `container` puro; formulários/documentos (novo contrato, detalhe, registro, login) ficam estreitos.
- Identidade: terracota como cor primária, logo "P" hexagonal formado por dois ganchos com simetria rotacional e ponto central, wordmark em Poppins.

## Armadilhas conhecidas

- **Nunca rodar `next build` com o `next dev` ativo** — corrompe o `.next` e o dev passa a dar 500 `Cannot find module './NNN.js'`. Conserto: parar o dev, `rm -rf apps/web/.next`, subir de novo. Para checar tipos, usar `npm run typecheck`.
- **Seed restaurador:** `npm run db:seed` sempre devolve a base ao estado da demo; `db:seed:reset` limpa tudo e re-seeda.
- **Smoke autenticado via curl (NextAuth v5):** `GET /api/auth/csrf` (guarda cookie + token) → `POST /api/auth/callback/credentials` com `csrfToken/email/password/redirect=false` → reusar o cookie de sessão.
