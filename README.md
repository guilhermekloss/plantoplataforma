# Plantor

**Contratos de grãos que nascem dos dados da lavoura.**

Plantor é uma plataforma SaaS B2B para o agronegócio brasileiro que conecta
**produtores rurais** a **cooperativas e tradings**. O produtor vê a própria
produção (dados de máquinas, solo, clima e silo reunidos), escolhe o que vender
e a plataforma transforma o lote em oferta; a cooperativa encontra a oferta no
mercado e gera o contrato com um clique, já com os dados de campo anexados —
assinatura eletrônica, acompanhamento de entregas, desconto automático por
qualidade e uma trilha de auditoria imutável.

> **Estado do projeto:** MVP funcional (Fase 01). As integrações externas de
> dados — cotações, clima, satélite, telemetria de máquinas e termometria de
> silo — são **simuladas de propósito** por *providers* que espelham o contrato
> das APIs reais. Blockchain, PDF da CPR, PIX e WhatsApp estão no roadmap.
> Veja [Roadmap](#roadmap).

## Sumário

- [O problema](#o-problema)
- [O que a plataforma faz](#o-que-a-plataforma-faz)
- [Arquitetura](#arquitetura)
- [Início rápido](#início-rápido)
- [Dados de demonstração](#dados-de-demonstração)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts](#scripts)
- [Testes](#testes)
- [Segurança e multi-tenancy](#segurança-e-multi-tenancy)
- [Integrações de dados](#integrações-de-dados-simuladas-no-mvp)
- [Documentação](#documentação)
- [Roadmap](#roadmap)
- [Licença e contribuições](#licença-e-contribuições)

## O problema

A contratação de grãos no Brasil ainda depende de planilhas, papel e
conciliação manual. Isso gera retrabalho, erros de qualidade e prazo, descontos
disputados na entrega e pouca rastreabilidade — e o produtor, muitas vezes,
assina sem entender por completo o que está contratando.

## O que a plataforma faz

### Para o produtor (experiência mobile-first)

| Área | O que entrega |
|---|---|
| **Meu campo** | Telemetria da fazenda em um só lugar: colheitadeira, plantio, solo, clima do ciclo; **NDVI de satélite** com estimativa de produtividade antes da colheita; **termometria do silo** com alerta de desconto em R$ quando a massa aquece contra a cláusula de umidade do contrato; custo de produção × preço de mercado (break-even e margem); **preço-alvo** por cultura com sinal de venda; inteligência climática cruzando previsão do tempo com prazos de entrega. |
| **Produção** | Funil de venda: lotes colhidos e aptos → oferta no marketplace → contrato. Uma IA sugere ofertas (imediatas ou antecipadas, a partir do NDVI) com preço e margem calculados. |
| **Contratos** | Lista, detalhe com linha do tempo, assinatura eletrônica e explicação do contrato em **linguagem simples** (sem juridiquês), com os riscos em R$ destacados. |
| **Assistente** | Chat que responde prazos, quanto vai receber, multa e desconto por umidade **a partir dos contratos reais** — nunca inventa números. Funciona com Gemini ou, sem chave, com respostas determinísticas. |

### Para a cooperativa / trading

| Área | O que entrega |
|---|---|
| **Mercado** | Ofertas de lotes publicadas por produtores, com dados de campo já anexados, selo **"verificado por sensores"** ou **"declarado"**, rastreabilidade do lote e análise de preço. Aceite e geração do contrato com um clique. |
| **Contratos** | Wizard de 5 etapas (partes, objeto, preço, entrega, revisão), assinatura com hash, disputa e cancelamento. |
| **Entregas** | Registro de entregas, laudo de qualidade, classificação MAPA automática, **desconto por qualidade** e liberação de pagamento até a liquidação. |
| **Painel** | KPIs e distribuição de contratos por status. |

### Ciclo de vida do contrato

```
rascunho → pendente_assinatura_comprador → pendente_assinatura_produtor → assinado
        → em_execucao → entregue_parcial → liquidado          (disputado · cancelado)
```

A máquina de estados é compartilhada entre API e web (`packages/shared`). Cada
transição gera um evento na linha do tempo do contrato, e a assinatura registra
o **hash SHA-256 do JSON canônico** do contrato — qualquer alteração posterior
é detectável.

Grãos suportados: soja, milho, café, trigo, algodão, sorgo e feijão.

## Arquitetura

Monorepo [Turborepo](https://turbo.build) com npm workspaces.

```
apps/
  api/        NestJS 10 + Prisma 5 + PostgreSQL
              auth · contracts · deliveries · dashboard · notifications
              field-data (providers simulados) · offers · organizations · ai
  web/        Next.js 14 (App Router) + Tailwind + shadcn/ui + NextAuth v5
              login/registro/convite · painel · contratos · Meu campo ·
              Produção · Mercado · Assistente
packages/
  shared/     Enums, defaults MAPA, hash canônico, máquina de estados e cálculo
              de desconto — usado por API e web (CommonJS)
docs/         Specs, plano técnico de dados/IoT e histórico de decisões
landingpage/  Página institucional estática
```

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind, shadcn/ui, NextAuth v5, recharts, lucide-react |
| Backend | NestJS 10, Prisma 5, PostgreSQL 16, Zod, Throttler |
| Auth | JWT (access 15 min / refresh 7 dias), bcrypt, RBAC por tipo de organização |
| IA | Google Gemini (`gemini-2.5-flash`) — **opcional**, com fallback determinístico |
| E-mail | Resend (templates HTML) — opcional em dev (sem chave, apenas loga) |
| Testes | Vitest (unit + e2e com Postgres real), supertest |

Decisões de arquitetura e armadilhas conhecidas estão em
[`docs/historico-decisoes.md`](docs/historico-decisoes.md).

## Início rápido

**Pré-requisitos:** Node 18+ (testado no 26), npm e Docker (para o Postgres local).

```bash
# 1. Dependências
npm install

# 2. Postgres local (Docker, porta 5434)
docker compose up -d

# 3. Variáveis de ambiente (veja a próxima seção para gerar os segredos)
#    Crie apps/api/.env e apps/web/.env.local — modelo em .env.example

# 4. Pacote compartilhado (a API consome o build) e banco
npm run build --workspace=@plantor/shared
npm run db:migrate:deploy --workspace=@plantor/api
npm run db:seed --workspace=@plantor/api

# 5. Subir API (http://localhost:3001) e web (http://localhost:3000)
npm run dev
```

Abra <http://localhost:3000> e entre com um dos usuários da
[demonstração](#dados-de-demonstração).

> Se a porta 3000 ou 3001 já estiver em uso, ajuste `PORT` na API e a porta do
> web (`next dev -p <porta>`), e atualize `APP_WEB_URL`, `CORS_ORIGINS` e
> `NEXTAUTH_URL` para a nova origem.

## Dados de demonstração

`npm run db:seed` cria uma base de demonstração completa. Senha de todos os
usuários: **`plantor123`** (só para desenvolvimento local).

| Login | Perfil | O que mostra |
|---|---|---|
| `operador@cotrijal.example` | Cooperativa | Painel com 6 contratos em todos os estados, Mercado com 3 ofertas (selo "verificado por sensores" × "declarado"), pagamento a liberar |
| `joao@fazenda.example` | Produtor, 24 ha | Meu campo com silo aquecendo × cláusula do contrato (desconto em R$), sinal de preço-alvo da soja, trigo em desenvolvimento com NDVI, sugestão de oferta antecipada |
| `gerente@boavista.example` | Fazenda mista, 10.000 ha | Escala: 5 lavouras e 4.500 cabeças de gado, contrato liquidado com entregas pagas |
| `maria@boaesperanca.example` | Sítio, 18 ha | Produtor sem sensores — oferta "declarada" |

O seed é **restaurador**: recria os contratos da demo a cada execução, e suas
datas são deslocadas até o dia atual para que os prazos nunca apareçam
vencidos. `npm run db:seed:reset --workspace=@plantor/api` limpa a base inteira
antes de re-semear.

## Variáveis de ambiente

Cada app valida as suas variáveis com Zod ao iniciar (`apps/api/src/config/env.schema.ts`
e `apps/web/src/env.ts`). **Nunca faça commit de `.env` reais.**

Para desenvolvimento local com o Docker deste repositório:

```bash
# apps/api/.env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://plantor:plantor@localhost:5434/plantor?schema=public"
DIRECT_URL="postgresql://plantor:plantor@localhost:5434/plantor?schema=public"
JWT_ACCESS_SECRET="<gere com: openssl rand -base64 48>"
JWT_REFRESH_SECRET="<gere outro com: openssl rand -base64 48>"
APP_WEB_URL="http://localhost:3000"
CORS_ORIGINS="http://localhost:3000"
```

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="<gere com: openssl rand -base64 32>"
```

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DATABASE_URL` / `DIRECT_URL` | sim | Postgres (runtime / migrações). Em produção, Supabase com pooling |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | sim | Assinatura dos tokens (≥ 32 caracteres) |
| `AUTH_SECRET` | sim (web) | Segredo do NextAuth |
| `GEMINI_API_KEY` | não | IA real (explicação, assistente, sugestões). Sem ela, tudo roda no modo determinístico |
| `RESEND_API_KEY` | não | Envio real de e-mails (convites, avisos de prazo). Sem ela, apenas loga |
| `CORS_ORIGINS`, `APP_WEB_URL` | recomendado | Origens permitidas e links dos e-mails |
| `THROTTLE_TTL_SECONDS` / `THROTTLE_LIMIT` | não | Rate limit global (padrão: 100 req/min por IP) |
| `SENTRY_DSN` | não | Observabilidade |

A lista completa e comentada está em [`.env.example`](.env.example).

## Scripts

```bash
npm run dev          # api + web em modo desenvolvimento
npm run build        # build de tudo (shared → api → web)
npm run typecheck    # tsc em todos os workspaces
npm run lint         # eslint
npm run test         # testes unitários (sem banco)

npm run test:e2e --workspace=@plantor/api           # integração contra Postgres
npm run test:cjs-smoke --workspace=@plantor/shared  # shared carrega via require()
npm run db:seed --workspace=@plantor/api            # re-semeia a demo
npm run db:seed:reset --workspace=@plantor/api      # limpa tudo e re-semeia
```

## Testes

- **Unitários** (`packages/shared`, `apps/api`): hash canônico, tabelas MAPA,
  desconto por qualidade, máquina de estados, regra de acesso a contratos e o
  assistente determinístico.
- **e2e** (`apps/api/test/*.e2e-spec.ts`): HTTP real contra PostgreSQL, sem
  mock de banco — autenticação e convite, contratos e assinatura, entregas e
  laudos, dashboards, avisos de prazo, dados de campo, webhook de colheita e
  marketplace de ofertas.

A suíte e2e **apaga os dados** do banco que usa; por isso roda num banco
separado, `plantor_test`, na mesma instância do Docker. Crie
`apps/api/.env.test` (modelo no fim do [`.env.example`](.env.example)). O
`test/global-setup.ts` aborta se o nome do banco não contiver "test" e aplica as
migrações antes da suíte — o banco de desenvolvimento nunca é tocado.

## Segurança e multi-tenancy

- **Isolamento entre organizações:** o tenant vem **sempre** do JWT (via CLS),
  nunca do cliente. Contratos cruzam dois tenants e são acessíveis apenas por
  comprador ou vendedor (`apps/api/src/prisma/contract-access.ts`).
- **RBAC** por tipo de organização (cooperativa/trading × produtor) em cada rota.
- **Integridade:** assinatura eletrônica simples (MP 2.200-2/2001) com hash
  SHA-256 do JSON canônico; linha do tempo de auditoria por contrato.
- **Rate limiting** global e específico da IA (20 req/min), CORS por lista
  explícita e validação de entrada com Zod em todas as rotas.
- **Segredos** só por variáveis de ambiente validadas no startup.

Encontrou uma vulnerabilidade? Não abra uma issue pública — entre em contato
com o mantenedor pelo perfil do GitHub.

## Integrações de dados (simuladas no MVP)

Os feeds de campo e mercado são **simulados** (determinísticos por dia e
rotulados `— simulado no MVP`). Cada *provider* espelha o contrato de uma API
real; na Fase 03 troca-se apenas a implementação, não os consumidores:

| Dado | API real a consumir | Provider | Alimenta |
|---|---|---|---|
| Cotações | CEPEA/ESALQ e B3 | `market.provider` | Break-even, margem, sinal de venda |
| Clima | Open-Meteo (fallback INMET) | `weather.provider` | Alertas de geada/chuva, risco climático dos prazos |
| NDVI | Copernicus Sentinel-2 ou EOSDA | `satellite.provider` | Estimativa pré-colheita, oferta antecipada |
| Máquinas | John Deere Operations Center, Climate FieldView, IoTag | `telemetry.provider` | Lote criado sozinho na colheita (webhook) |
| Silo | Procer ou QualyAgro | `silo.provider` | Alerta de desconto na cláusula de umidade |

Plano completo em [`docs/plano-tecnico-dados-iot.md`](docs/plano-tecnico-dados-iot.md).

## Documentação

- [`docs/historico-decisoes.md`](docs/historico-decisoes.md) — direção de produto, decisões de arquitetura e armadilhas conhecidas.
- [`docs/plano-tecnico-dados-iot.md`](docs/plano-tecnico-dados-iot.md) — providers, eventos de campo e plano de integrações reais.
- [`docs/specs/`](docs/specs/) — especificações originais: guia do projeto, prompt de implementação do MVP e pesquisa de mercado.

## Roadmap

**Feito (MVP, Fase 01)** — scaffolding e multi-tenancy · autenticação e convite ·
contratos (wizard, assinatura com hash, máquina de estados) · dashboards por
ator · entregas, laudo, grade MAPA e desconto · timeline de auditoria ·
Meu campo · marketplace de lotes · IA com fallback · dados de campo e IoT
simulados.

**Próximo**

- Fase 02: PDF da CPR e upload de laudo, registro em blockchain (Polygon), PIX, alertas por WhatsApp, ICP-Brasil.
- Fase 03: integrações reais dos providers (tabela acima) e oráculos de preço B3/CBOT.
- Templates de e-mail com React Email e "salvar rascunho parcial" de contrato.

## Licença e contribuições

Este repositório **não possui licença open source**: por padrão, todos os
direitos são reservados ao autor. Para usar, redistribuir ou contribuir,
entre em contato antes. Sugestões e relatos de bugs são bem-vindos via issues.
