# Plantor — MVP

Plataforma SaaS B2B para contratos de grãos no agronegócio brasileiro. Conecta
cooperativas/tradings e produtores rurais com criação de contratos parametrizados, assinatura digital (eletrônica simples — MP 2.200-2/2001), acompanhamento de entregas/qualidade e timeline auditável.

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, NextAuth v5, recharts, lucide-react |
| Backend | NestJS 10, Prisma 5, PostgreSQL |
| IA | Google Gemini (`@google/genai`, modelo `gemini-2.5-flash`) — opcional, com fallback determinístico sem chave |
| Auth | JWT (access 15m / refresh 7d), bcrypt, RBAC |
| Email | Resend (templates HTML) |
| Multi-tenant | Shared DB + RLS via middleware Prisma |

## Estrutura

```
apps/
  api/        NestJS — auth, contracts, deliveries, dashboard, notifications,
              field-data (telemetria/clima/mercado + providers simulados de
              satélite/silo/máquinas), offers (marketplace de lotes),
              organizations (busca de produtores), ai (explicação e assistente Gemini)
  web/        Next.js — login/registro/convite, dashboard, contratos (wizard, detalhe),
              Meu campo, Produção, Mercado, Assistente
packages/
  shared/     enums, defaults MAPA, hash canônico, máquina de estados, cálculo de desconto
```

### Novas telas e módulos (pós-MVP)

| Área | O que faz |
|---|---|
| **Meu campo** (`/campo`) | Painel do produtor com telemetria de campo (colheitadeira, plantio, solo, NDVI, clima do ciclo), armazenagem pós-colheita (termometria de silo com alerta de temperatura), custo de produção vs. preço de mercado (break-even/margem) e inteligência climática cruzando previsão do tempo com prazos de contrato em aberto. |
| **Produção** (`/producao`) | Funil de venda do produtor: lotes colhidos/aptos → oferta no marketplace → contrato. Mostra sugestões de oferta geradas por IA a partir dos lotes disponíveis. |
| **Mercado** (`/mercado`) | Marketplace para cooperativas/tradings: lista ofertas de lotes disponibilizadas por produtores, com dados de campo já anexados, para aceitar e gerar contrato com um clique. |
| **Assistente** (`/assistant`) | Chat com IA (Gemini) para o produtor tirar dúvidas sobre os próprios contratos, prazos e descontos por qualidade, sempre a partir dos dados reais (nunca inventa números). |
| API `ai` | `POST /ai/contracts/:id/explain` (explica um contrato em linguagem simples), `POST /ai/assistant` (chat), `POST /ai/suggest-contracts` (agente que sugere ofertas a partir dos lotes aptos do produtor). Rate limit próprio (20 req/min). |
| API `field-data` | `GET /field-data/overview` — telemetria + clima + cotações + decisão de venda, e ainda: série NDVI com estimativa pré-colheita (`satellite`), termometria do silo com projeção de desconto contratual (`storage.telemetry`/`storageRisk`) e sinal de preço-alvo (`market.quotes[].targetHit`). `POST /field-data/events/harvest` — webhook de colheita da OEM (cria o lote sozinho, idempotente por `externalId`; `/simulate` gera o evento em dev). `PATCH /field-data/target-price` — preço-alvo por cultura. |
| API `offers` | Marketplace de lotes: produtor cria oferta (`POST /offers`), lista as próprias (`GET /offers/mine`), cooperativa/trading vê o marketplace (`GET /offers/marketplace`, cada oferta com selo `verification` — "sensores" quando o lote tem telemetria/termometria/NDVI anexados) e aceita (`POST /offers/:id/accept`), virando `Contract`. |
| API `organizations` | `GET /organizations/producers?q=` — busca de produtores para a Etapa 1 do wizard de contrato. |

Novos models Prisma: `FieldReading` (telemetria de campo — colheita, plantio, solo, clima, armazenagem, custo) e `Offer` (oferta de lote do produtor até virar contrato). `Organization` ganhou `farmProfile`/`livestock` (JSON) para perfil de propriedade mista (área/pastagem/reserva e rebanho).

## Integrações de dados (simuladas no MVP)

Os feeds de campo/mercado são **simulados** (determinísticos por dia, rotulados
`— simulado no MVP` no `source`). Cada um espelha o contrato de uma API real, a
consumir na Fase 03 trocando só a implementação do provider
(plano completo em [docs/plano-tecnico-dados-iot.md](docs/plano-tecnico-dados-iot.md)):

| Dado | API real a consumir (Fase 03) | Provider | Alimenta |
|---|---|---|---|
| Cotações de grãos | **CEPEA/ESALQ** (indicadores diários soja/milho/trigo) e **B3** (futuros CCM/SFI) | `market.provider` | Break-even/margem, sinal de venda, KPIs de Mercado |
| Previsão do tempo | **Open-Meteo** (gratuita, sem chave) com fallback **INMET** (estações oficiais) | `weather.provider` | Alertas de geada/chuva, janela seca, inteligência climática × prazos de contrato |
| NDVI / saúde da lavoura | **Copernicus Sentinel-2** (gratuito) ou **EOSDA Crop Monitoring API** | `satellite.provider` | Estimativa de volume pré-colheita, sugestão de oferta a termo (IA) |
| Telemetria de máquinas | **John Deere Operations Center API** (OAuth2), **Climate FieldView**; multi-marca via **IoTag** | `telemetry.provider` | Criação automática de lote na colheita (funil de Produção), custo de combustível |
| Termometria de silo | **Procer** ou **QualyAgro (QUALYWireless)** | `silo.provider` | Alerta de qualidade com impacto R$ nas cláusulas de desconto do contrato |

### Design system (web)

Primitivas compartilhadas a reutilizar em telas novas (`apps/web/src`):
- `components/grain-icon.tsx` — `GrainChip`/`GrainIcon`: ícone SVG por tipo de grão (nunca emoji 🌾/🌽).
- `components/kpi-card.tsx` — `KpiCard`: cartão de KPI padrão.
- `lib/format.ts` — `formatMoneyCompact`/`formatSacksCompact`: valores monetários grandes sempre compactados nos KPIs (valor completo no `title`).
- `animate-fade-up` (globals.css) — utilitária de entrada de página.
- Disposição padrão: páginas de listagem/dashboard usam `container` com zona principal + `aside` em `lg:grid-cols-3`; páginas de formulário/documento único ficam estreitas (`max-w-2xl`/`max-w-3xl`).

## Pré-requisitos

- Node 18+ (testado em 26)
- Docker (para o Postgres local) **ou** um Postgres acessível
- Conta Resend (opcional em dev — sem a chave, emails são apenas logados)
- Chave da API Gemini (opcional em dev — sem `GEMINI_API_KEY`, os recursos de IA usam fallback determinístico, sem custo/latência de LLM)

## Setup local

```bash
# 1. Dependências
npm install

# 2. Banco local (Postgres em Docker, porta 5434)
docker compose up -d

# 3. Variáveis de ambiente
cp .env.example .env                 # referência geral
# apps/api/.env e apps/web/.env.local já vêm com valores de dev apontando p/ o Docker

# 3b. Testes e2e: crie apps/api/.env.test (bloco no fim do .env.example)

# 4. Build do pacote compartilhado (a api consome o dist) + migração + seed
npm run build --workspace=@plantor/shared

# Migração + seed (cenário completo de demo: cooperativa + 3 produtores,
#    contratos em todos os estados, marketplace com ofertas e dados de campo)
npm run db:migrate --workspace=@plantor/api
npm run db:seed    --workspace=@plantor/api

# 5. Subir tudo (api em :3001, web em :3000)
npm run dev
```

Credenciais do seed (senha `plantor123`):

| Login | Papel | O que mostra na demo |
|---|---|---|
| `operador@cotrijal.example` | Cooperativa | Dashboard com 6 contratos no ciclo completo (rascunho → liquidado), Mercado com 3 ofertas (selo "verificado por sensores" vs "declarado"), pagamento pendente a liberar |
| `joao@fazenda.example` | Produtor 24 ha | Meu campo com silo aquecendo × cláusula de contrato (alerta de desconto em R$), sinal de preço-alvo da soja, lavoura de trigo em desenvolvimento com NDVI, sugestão de oferta antecipada da IA |
| `gerente@boavista.example` | Fazenda mista 10.000 ha | Escala: 5 lavouras + 4.500 cabeças, contrato liquidado com histórico de entregas pagas, oferta de sorgo no marketplace |
| `maria@boaesperanca.example` | Sítio 18 ha | Produtor sem sensores — oferta "declarada" (contraste do selo) |

O seed é **restaurador**: os contratos da demo são recriados do zero a cada
execução, então `npm run db:seed` sempre devolve a base ao estado de
apresentação. `npm run db:seed:reset --workspace=@plantor/api` limpa tudo e
re-seeda.

## Scripts úteis

```bash
npm run build       # turbo build (shared → api → web)
npm run typecheck   # tsc em todos os workspaces
npm run test        # testes unitários (sem DB)
npm run test:e2e --workspace=@plantor/api        # integração contra Postgres (banco plantor_test)
npm run test:cjs-smoke --workspace=@plantor/shared # shared carrega via require() (após o build)
npm run db:seed --workspace=@plantor/api         # re-seed da demo (restaurador, idempotente)
npm run db:seed:reset --workspace=@plantor/api   # limpa a base inteira e re-seeda (pós-e2e)
```

## Testes

- **Unit** (`packages/shared`, `apps/api`): lógica pura — hash canônico, MAPA, desconto, máquina de estados, regra de acesso (`contract-access.spec.ts`).
- **e2e** (`apps/api/test/*.e2e-spec.ts`): HTTP real + PostgreSQL (Docker), conforme a regra de não mockar o banco.

| Arquivo | Cobre |
|---|---|
| `auth.e2e-spec.ts` | Login, refresh, convite |
| `contracts.e2e-spec.ts` | Wizard, assinatura+hash, máquina de estados |
| `dashboard.e2e-spec.ts` | Dashboards por ator |
| `deliveries.e2e-spec.ts` | Entregas, laudo, desconto por qualidade |
| `rls.e2e-spec.ts` | Acesso a `Contract` pela regra buyer/seller (multi-tenant) |
| `notifications.e2e-spec.ts` | Aviso de prazo (janela de 30 dias) |
| `field-data.e2e-spec.ts` | `GET /field-data/overview` — telemetria, culturas, estimativa de preço; NDVI/estimativa pré-colheita do lote em desenvolvimento; silo aquecendo × cláusula do contrato (umidade projetada, desconto em R$, alerta urgente); preço-alvo (`PATCH /target-price`, `targetHit`, sinal de venda, remoção do alvo, RBAC); sugestão de IA `antecipada` vs `imediata` (`POST /ai/suggest-contracts`) |
| `field-data-events.e2e-spec.ts` | Webhook de colheita (`POST /field-data/events/harvest`): cria lote `colhido`, idempotência por `externalId`, lote no overview, RBAC 403 para cooperativa, payload inválido 400, `/simulate` (botão dev) |
| `offers.e2e-spec.ts` | Marketplace de lotes: RBAC, oferta → aceite → contrato, ofertas já usadas/contratadas, selo `verification` (`declarado` sem sensores; `sensores` com telemetria+silo+NDVI) |

> A suíte e2e apaga os dados do banco que usa, por isso roda num banco
> **separado** (`plantor_test`, mesma instância Docker na 5434), configurado em
> `apps/api/.env.test` (modelo no `.env.example`). O `test/global-setup.ts`
> aborta se o nome do banco não contiver "test" e aplica as migrações antes da
> suíte — o seed de dev nunca é tocado.

### Pendências de cobertura

- A assistente tem fallback determinístico (`apps/api/src/ai/assistant-fallback.ts`, com testes unitários): sem `GEMINI_API_KEY` ou com o Gemini fora, responde prazos, valores, multa e desconto por umidade a partir dos contratos reais.
- Não há e2e para `/ai/explain` e `/ai/assistant` nem para `organizations` (`/organizations/producers`) — descobertos manualmente/via smoke test. `/ai/suggest-contracts` é coberto pelo `field-data.e2e-spec.ts` (caminho de fallback determinístico, sem chave Gemini).
- Os providers simulados (`apps/api/src/field-data/providers/`) não têm testes unitários próprios — são exercitados via e2e do overview. Ao trocar por integrações reais (Fase 03), criar testes de contrato por provider.

## Multi-tenancy (RLS)

- Middleware Prisma injeta `tenantId` apenas em `TENANT_OWNED_MODELS` (hoje vazio).
- `Contract` cruza dois tenants: acesso pela regra `OR(buyerId, sellerId)`
  (`apps/api/src/prisma/contract-access.ts`). Filhos do contrato são autorizados
  pelo contrato pai na camada de serviço.
- O tenant vem **sempre** do JWT (via CLS), nunca do client.

## Produção

- **web** → Vercel · **api** → Railway · **db** → Supabase.
- Preencher `.env` com `DATABASE_URL`/`DIRECT_URL` (Supabase), segredos JWT,
  `AUTH_SECRET` (NextAuth), `RESEND_API_KEY` e `CORS_ORIGINS`.
- `npm run db:migrate:deploy --workspace=@plantor/api` aplica migrações.

## Status dos módulos (MVP completo)

| Módulo | Conteúdo |
|---|---|
| 0 | Scaffolding, schema, RLS, validação de env |
| 1 | Auth, convite (magic link), NextAuth |
| 2 | Contratos: wizard 5 etapas, assinatura+hash, máquina de estados, emails |
| 3 | Dashboards por ator (cooperativa desktop / produtor mobile) |
| 4 | Entregas, laudo manual, grade MAPA automática, desconto, liquidação |
| 5 | Timeline de auditoria (`ContractTimeline`) |
| 6 | Meu campo: telemetria (colheitadeira/plantio/solo/clima), armazenagem, custo x margem, inteligência climática de prazos |
| 7 | Marketplace de lotes: oferta do produtor (Produção) → aceite da cooperativa/trading (Mercado) → contrato |
| 8 | IA (Gemini): explicação de contrato, assistente de chat, sugestão de ofertas — com fallback sem chave |
| 9 | Dados & IoT (providers simulados): NDVI/estimativa pré-colheita, termometria de silo × cláusula de desconto, webhook de colheita (lote automático), preço-alvo/sinal de venda, oferta antecipada por IA, selo "verificado por sensores" — ver [docs/plano-tecnico-dados-iot.md](docs/plano-tecnico-dados-iot.md). UI em Meu campo: cards de NDVI (curva + estimativa) e de termometria do silo com desconto projetado em R$, preço-alvo por cultura e botão "Simular colheita" (só fora de produção). |

### Pendências conscientes (Fase 02 / fora do MVP)

- Geração de PDF da CPR e upload de laudo (campos `fileUrl`/`fileHash` reservados).
- Blockchain (Polygon), PIX, WhatsApp, ICP-Brasil, oráculos B3/CBOT.
- Templates de email com React Email (hoje HTML simples).
- "Salvar rascunho parcial" exigiria tornar campos de `Contract` nullable.
- Integrações reais dos providers (Fase 03): ver tabela em
  [Integrações de dados](#integrações-de-dados-simuladas-no-mvp).
