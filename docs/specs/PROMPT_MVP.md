# Plantor — Prompt de Implementação do MVP

> **Como usar:** cole este conteúdo como primeira mensagem em uma nova sessão do Claude Code (Opus) dentro do repositório do projeto. O CLAUDE.md será carregado automaticamente pelo contexto do workspace — este prompt define a missão, a ordem de execução e os critérios de aceite.

---

## Seu papel

Você é o engenheiro full-stack sênior responsável por implementar o MVP da Plantor — uma plataforma SaaS B2B para contratos de grãos no agronegócio brasileiro.

Você opera em três frentes:
- **Engenharia**: código limpo, tipado, testado, seguro
- **Produto**: foco implacável no que valida o produto com o cliente piloto — resista ao scope creep
- **Domínio**: você entende contratos agrícolas, qualidade de grãos e o framework jurídico brasileiro o suficiente para tomar decisões de modelagem corretas

**Leia o `CLAUDE.md` agora.** Ele contém o contexto de negócio, domínio jurídico, modelo de dados completo e as decisões arquiteturais tomadas. Não contradiga nada que esteja lá sem alertar antes.

---

## Missão

Implementar o MVP da Plantor (Fase 01) — **sem blockchain**. O objetivo é validar o fluxo de negócio completo com um cliente piloto antes de adicionar complexidade de infraestrutura.

O que deve funcionar ao final:
1. Cooperativa ou trading cria um contrato de grãos parametrizado
2. Produtor recebe convite por email, visualiza o resumo e assina digitalmente
3. Sistema acompanha entregas e calcula ajustes de qualidade automaticamente
4. Timeline auditável de todos os eventos por contrato
5. Dashboard diferenciado por ator (cooperativa vs. produtor)

> **Blockchain entra na Fase 02.** O schema do banco já reserva os campos `contractHash`, `blockchainTxHash` e `blockchainNetwork` como nullable. Não implemente nada de blockchain agora — apenas deixe os campos existirem sem valor.

---

## Stack (não reabre)

```
Monorepo:   Turborepo
Frontend:   Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
Backend:    NestJS + TypeScript
ORM:        Prisma + PostgreSQL via Supabase
Auth:       NextAuth.js v5 + JWT (access 15min / refresh 7d)
Email:      Resend + React Email
Deploy:     Vercel (web) + Railway (api) + Supabase (db)
Multi-tenant: Shared DB + Row-Level Security via Prisma middleware
Assinatura: Click-to-sign (eletrônica simples — válida pelo MP 2.200-2/2001)
```

> **Sem geração de PDF no MVP.** O contrato é uma página web estruturada. A assinatura armazena hash SHA-256 do JSON canônico do contrato (não de um PDF). Supabase Storage não é necessário nesta fase — os laudos de qualidade são inseridos como campos de formulário, não como upload de arquivo.

---

## Módulos e ordem de implementação

Implemente **em ordem**. Sinalize quando cada módulo estiver pronto antes de avançar. Não pule etapas.

---

### Módulo 0 — Scaffolding (Dia 1–2)

**O que fazer:**
1. Criar monorepo Turborepo com workspaces: `apps/web`, `apps/api`, `packages/shared`
2. Configurar `apps/api`: NestJS + Prisma + conexão Supabase
3. Configurar `apps/web`: Next.js 14 + Tailwind + shadcn/ui
4. Implementar o schema Prisma da seção 11 do CLAUDE.md — todas as entidades, enums e índices. Os campos de blockchain (`contractHash`, `blockchainTxHash`, `blockchainNetwork`, `blockchainContractAddr`) devem existir como `String?` (nullable) e ficar vazios por agora
5. Implementar middleware de RLS no Prisma que injeta `tenantId` em todas as queries de modelos tenant-scoped
6. Validar variáveis de ambiente com Zod no startup de ambas as apps
7. Criar `.env.example` documentado
8. Confirmar que `turbo run build` passa sem erros

**Critérios de aceite:**
- [ ] `turbo run build` passa
- [ ] `prisma migrate dev` cria todas as tabelas
- [ ] Teste manual: query de um tenant não retorna dados de outro
- [ ] `.env.example` com todas as variáveis necessárias

---

### Módulo 1 — Autenticação e Onboarding (Semana 1–2)

**Cadastro simples — MVP é piloto com 2–5 clientes conhecidos.**

**Backend (NestJS):**

| Endpoint | Descrição |
|----------|-----------|
| `POST /auth/register` | Nome + email + senha + tipo (cooperative \| trading \| producer) |
| `POST /auth/login` | Email + senha → JWT |
| `POST /auth/refresh` | Renova token |
| `POST /auth/invite` | Envia magic link para produtor (TTL 24h) |
| `POST /auth/accept-invite/:token` | Produtor define senha e acessa |

Regras:
- Senhas: bcrypt 12 rounds
- Guard global de auth + `@Roles(...)` em rotas protegidas
- Magic link expirado → erro claro (não genérico)
- Campos opcionais (CNPJ, CPF, endereço, CAR) podem ser preenchidos depois no perfil — não bloqueiam o cadastro

**Email de convite ao produtor (Resend):**
- Quem convidou + link de aceite + "expira em 24h"
- Template HTML simples — sem design elaborado no MVP

**Frontend:**
- `/login` — email + senha
- `/register` — nome, email, senha, tipo (3 opções: Cooperativa / Trading / Produtor)
- `/invite/[token]` — "Você foi convidado por X. Crie sua senha."
- Middleware: `/dashboard/*` redireciona para `/login` se não autenticado

**Critérios de aceite:**
- [ ] Cooperativa cria conta e faz login em < 1 minuto
- [ ] Cooperativa convida produtor; produtor recebe email e cria conta pelo link
- [ ] Rota protegida sem token retorna 401
- [ ] Usuário de um tenant não vê dados de outro (RLS)

---

### Módulo 2 — Gestão de Contratos (Semana 3–6)

O core do produto. O maior bloco de trabalho.

**Backend (NestJS) — `ContractsModule`:**

```
POST   /contracts                  criar rascunho
GET    /contracts                  listar (filtros: status, grainType, sellerId)
GET    /contracts/:id              detalhe completo
PATCH  /contracts/:id              atualizar rascunho
POST   /contracts/:id/submit       rascunho → pendente_assinatura_comprador
POST   /contracts/:id/sign         registrar assinatura da parte autenticada
POST   /contracts/:id/dispute      abrir disputa com motivo obrigatório
POST   /contracts/:id/cancel       cancelar com motivo obrigatório
GET    /contracts/:id/events       timeline de eventos
```

**Regras de negócio:**
- `contractNumber` gerado automaticamente: `PLT-{ANO}-{SEQUENCIAL 4 DÍGITOS}` → ex: `PLT-2025-0001`
- Apenas `cooperative` ou `trading` pode criar contratos
- `sellerId` deve ser uma organização do tipo `producer`
- `deliveryDeadline` não pode estar no passado
- Transição para `assinado` exige `ContractSignature` de ambas as partes
- Cada transição gera um `ContractEvent` (performedById, eventType, description, createdAt)
- Usar `$transaction` para atualizar contrato + criar evento atomicamente

**Assinatura digital — o que armazenar em `ContractSignature`:**
```typescript
{
  contractId,
  userId,
  signerRole,        // "seller" | "buyer"
  ipAddress,         // capturado do request
  userAgent,         // capturado do request
  documentHashBefore, // SHA-256 do JSON canônico do contrato antes de assinar
  documentHashAfter,  // SHA-256 do JSON canônico após registrar a assinatura
  signedAt           // timestamp do servidor
}
```

> Sem PDF no MVP. O "documento" que é assinado é o JSON canônico do contrato serializado e ordenado por chave. O hash garante a imutabilidade dos dados para fins jurídicos — idêntico à abordagem de hash de PDF, mas sem a dependência de geração de arquivo. Na Fase 02 gera-se o PDF a partir desses mesmos dados.

**Frontend — Wizard de criação em 5 etapas:**

Cada etapa valida antes de avançar. Mostrar barra de progresso.

**Etapa 1 — Partes:**
- Campo de busca para selecionar produtor cadastrado (autocomplete por nome ou CPF)
- Botão "Convidar novo produtor" → abre modal com campo de email
- Exibir card do produtor selecionado com nome, CPF e cidade

**Etapa 2 — Objeto:**
- Dropdown de tipo de grão com ícone (🌱 Soja, 🌽 Milho, ☕ Café, etc.)
- Quantidade em sacas (com conversão automática para toneladas exibida abaixo)
- Campo de safra (ex: "2025/2026")
- Período da safra: Primeira / Segunda / Única
- Parâmetros de qualidade MAPA **pré-preenchidos com os padrões T1** (editáveis):
  - Umidade máx: 14%
  - Impurezas máx: 1%
  - PH mínimo: 660 g/L
  - Avariados máx: 8%
- Tipo de ajuste por não conformidade: Proporcional / % Fixo / Rejeição / Nenhum

**Etapa 3 — Preço:**
- Tipo de fixação: Preço fixo | Média de mercado | Indexado (B3 — *funcionalidade futura, desabilitar no MVP*)
- Valor por saca (R$ ou USD)
- Valor total estimado calculado automaticamente
- Toggle de adiantamento (barter): se ativo, exibir campo de % e descrição dos insumos

**Etapa 4 — Entrega e Penalidades:**
- Nome e endereço do armazém
- Data limite de entrega (datepicker com bloqueio de datas passadas)
- Responsável pelo frete: Produtor / Comprador
- Cláusula penal: % do valor total (padrão: 10%)
- Toggle wash out (padrão: ativo)
- Toggle força maior (padrão: ativo)
- Foro de arbitragem (campo de texto livre)

**Etapa 5 — Revisão:**
- Resumo visual de todos os campos preenchidos
- Botão "Criar contrato" → persiste no banco com status `rascunho`
- Botão "Salvar rascunho" disponível em qualquer etapa

**Página de detalhe do contrato:**
- Exibe todos os dados do contrato como página web estruturada (sem PDF)
- Status com badge colorido
- Botão "Assinar" visível apenas para quem ainda não assinou e é a vez da parte
- Seção "Histórico" — componente `ContractTimeline`
- Seção "Entregas" (carregada no Módulo 4)

**Notificações por email:**

| Gatilho | Destinatário | Assunto |
|---------|-------------|---------|
| Contrato enviado para assinatura | Produtor | "Novo contrato aguarda sua assinatura" |
| Produtor assinou | Cooperativa | "Contrato {number} assinado pelo produtor" |
| Ambos assinaram | Ambos | "Contrato {number} ativo — entregas podem ser registradas" |
| Prazo de entrega em 30 dias | Cooperativa | "⚠️ Entrega vence em 30 dias — {number}" |
| Disputa aberta | Ambos | "Atenção: disputa aberta no contrato {number}" |

**Critérios de aceite:**
- [ ] Cooperativa cria contrato pelo wizard
- [ ] Produtor recebe email, acessa a página do contrato e assina
- [ ] Após ambas as assinaturas, status muda para `assinado`
- [ ] Hash SHA-256 do JSON canônico é armazenado antes e após cada assinatura
- [ ] Cada transição de status gera `ContractEvent` no banco
- [ ] Listagem funciona com filtro por status
- [ ] Usuário de outro tenant não acessa o contrato (RLS)

---

### Módulo 3 — Dashboard por Ator (Semana 5–6)

**Cooperativa / Trading — `/dashboard`:**

Cards de KPIs (dados reais do banco):
- Total de contratos ativos (status `em_execucao` + `entregue_parcial`)
- Volume comprometido em sacas no mês corrente
- Valor total em aberto (R$) — soma dos contratos não liquidados
- Entregas vencendo nos próximos 30 dias

Painel de alertas ordenado por urgência:
```
🔴 URGENTE   Contrato vencido sem entrega registrada (deliveryDeadline < hoje)
⚠️ ATENÇÃO   Entrega em ≤ 30 dias sem status em_execucao
📋 PENDENTE  Aguardando assinatura do produtor há > 3 dias
✅ AÇÃO      Entrega confirmada aguardando liberação de pagamento
```

Gráfico de contratos por status (donut chart — usar `recharts`).

Tabela rápida dos últimos 5 contratos criados com link direto.

**Produtor — `/dashboard`:**

Layout **mobile-first** (desenvolver para 375px como breakpoint base).

Cards de ação rápida:
- "Para assinar" com badge de contagem (destaque visual)
- "Entregas pendentes"
- "Ver histórico"

Lista de contratos com card visual por item:
- Ícone do grão + nome do grão
- Quantidade e safra
- Nome da cooperativa/trading
- Status em linguagem simples:
  - `pendente_assinatura_produtor` → "**Aguardando sua assinatura**"
  - `em_execucao` → "Em andamento"
  - `liquidado` → "Concluído"
- Data limite de entrega com destaque se < 30 dias

**Critérios de aceite:**
- [ ] KPIs refletem dados reais e atualizam ao recarregar
- [ ] Alertas estão ordenados por urgência
- [ ] No viewport de 375px, dashboard do produtor é usável sem scroll horizontal
- [ ] Cooperativa não vê contratos de outro tenant

---

### Módulo 4 — Gestão de Qualidade e Entregas (Semana 6–7)

**Backend:**

```
POST /deliveries                        registrar entrega
GET  /deliveries?contractId=:id         listar entregas de um contrato
POST /deliveries/:id/quality-report     anexar laudo (multipart/form-data)
GET  /deliveries/:id/quality-report     visualizar laudo
```

**Lógica de entrega:**
- Uma entrega pode ser parcial (`quantitySacks < contrato.quantitySacks - já entregues`)
- Após cada entrega, recalcular o total entregue
- Se `total entregue == contrato.quantitySacks` → status do contrato muda para `liquidado`
- Se `total entregue < contrato.quantitySacks` → status muda para `entregue_parcial`
- Usar `$transaction` para atualizar delivery + contrato + criar event atomicamente
- `nfeKey`: validar que tem exatamente 44 caracteres numéricos

**Laudo de Classificação — entrada manual de campos:**
- Formulário com os parâmetros medidos (sem upload de arquivo no MVP)
- Campos: `moisturePct`, `impurityPct`, `specificWeightGL`, `damagedPct`, `grade`
- `grade` calculado automaticamente pelo backend com base nos thresholds MAPA do contrato
- Número do laudo e nome do laboratório: campos de texto livre

**Cálculo de desconto por qualidade** (aplicar conforme `Contract.qualityAdjType`):

```typescript
function calculatePriceAdjustment(
  contract: Pick<Contract, 'maxMoisturePct' | 'qualityAdjType'>,
  report: Pick<QualityReport, 'moisturePct'>
): number { // retorna % de desconto (0–100)
  const excess = Math.max(0, report.moisturePct - contract.maxMoisturePct)

  switch (contract.qualityAdjType) {
    case 'proportional':
      return excess * 0.7  // 0,7% de desconto por 1% acima — configurável futuramente
    case 'fixed_pct':
      return excess > 0 ? 2.0 : 0
    case 'rejection':
      return excess > 0 ? 100 : 0
    case 'none':
    default:
      return 0
  }
}
```

**Frontend:**

Na página do contrato, seção "Entregas":
- Barra de progresso: "750 de 1.000 sacas entregues (75%)"
- Botão "+ Registrar entrega"
- Modal de registro de entrega: data, quantidade (em sacas), chave NFe (44 dígitos), armazém receptor
- Após salvar entrega, opção inline "Anexar laudo de classificação"
- Formulário do laudo: campos com valores pré-preenchidos com padrões MAPA (editáveis)
- Exibir desconto calculado automaticamente antes de confirmar o laudo
- Tabela de entregas registradas com status de pagamento

**Critérios de aceite:**
- [ ] Entrega parcial muda status do contrato para `entregue_parcial`
- [ ] Entrega que completa o total muda para `liquidado`
- [ ] Desconto é calculado automaticamente e exibido antes de confirmar
- [ ] NFe com número de dígitos errado é rejeitada com mensagem clara
- [ ] Grade do grão é determinada automaticamente pelos parâmetros MAPA

---

### Módulo 5 — Rastreabilidade e Auditoria (Semana 7–8)

**Componente `ContractTimeline`:**

Renderiza todos os `ContractEvent` de um contrato em ordem cronológica decrescente.

Cada evento exibe:
- Ícone por tipo de evento
- Descrição legível em português
- Nome de quem realizou a ação
- Timestamp formatado ("há 3 dias" para recentes, data completa para antigos)

| EventType | Ícone | Cor da bolinha |
|-----------|-------|---------------|
| `criado` | 📄 | cinza |
| `assinado_comprador` | ✍️ | azul |
| `assinado_produtor` | ✍️ | azul |
| `em_execucao` | ▶️ | verde |
| `entregue` | 📦 | verde |
| `entregue_parcial` | 📦 | amarelo |
| `laudo_anexado` | 🔬 | roxo |
| `pagamento_liberado` | 💰 | verde escuro |
| `disputado` | ⚠️ | vermelho |
| `cancelado` | ✖️ | vermelho escuro |

> Na Fase 02, eventos on-chain serão adicionados à timeline com link para o explorador blockchain. O componente já deve aceitar uma prop `blockchainTxHash?: string`, renderizando o link apenas quando preenchida.

**Critérios de aceite:**
- [ ] Timeline exibe todos os eventos em ordem, com ícone e autor corretos
- [ ] Componente `ContractTimeline` aceita prop `blockchainTxHash` (nula por agora)

---

## Regras de desenvolvimento (não negociável)

**Segurança:**
- Dados pessoais (CPF, CNPJ, endereços) jamais expostos em logs
- Hash SHA-256 do JSON canônico do contrato armazenado antes e após cada assinatura
- Rate limiting: 100 req/min por IP via NestJS Throttler
- CORS: lista explícita de origens (não `*`)

**Qualidade de código:**
- TypeScript strict mode em todo o projeto
- Zod para validação de input em todos os endpoints
- Prisma `$transaction` para operações que tocam múltiplas tabelas
- Testes de integração nos fluxos críticos (não mockar o banco — usar PostgreSQL em Docker)

**Multi-tenancy:**
- O middleware de RLS injeta `tenantId` — nunca confiar no client para passar o tenant
- Testar explicitamente que usuário de tenant A não lê dados de tenant B

**Idioma:**
- Strings de UI: português
- Código (variáveis, funções, tipos, nomes de arquivo): inglês
- Comentários de domínio agro específico: português

---

## Como lidar com ambiguidade

Antes de implementar algo não coberto neste prompt ou no CLAUDE.md, **pare e pergunte**:

- Campo novo no banco → proponha a alteração e aguarde confirmação antes de migrar
- Regra de negócio com dois comportamentos possíveis → descreva os dois e pergunte
- Integração externa que precisa de credenciais → documente no `.env.example` e sinalize
- Decisão arquitetural que vai contra o CLAUDE.md → apresente a justificativa técnica antes de mudar

Não implemente silenciosamente uma alternativa quando encontrar ambiguidade.

---

## Checkpoints e cronograma

```
Dia  1–2   Módulo 0: scaffolding, schema, RLS
           → CHECKPOINT: turbo build passa, migrate roda, RLS funciona

Sem 1–2    Módulo 1: auth, convite
           → CHECKPOINT: cooperativa convida produtor, produtor aceita

Sem 2–4    Módulo 2: wizard de contratos, assinatura, estados, emails
           → CHECKPOINT: cooperativa cria contrato, produtor assina

Sem 4–5    Módulo 3: dashboards com KPIs e alertas
           → CHECKPOINT: alertas proativos no dashboard da cooperativa

Sem 5–6    Módulo 4: entregas e qualidade
           → CHECKPOINT: entrega com laudo manual e desconto automático

Sem 6      Módulo 5: timeline de auditoria
           → CHECKPOINT: histórico completo visível na página do contrato
```

---

## Primeira ação agora

Execute o Módulo 0:

1. `npx create-turbo@latest plantor` — selecionar blank template
2. Criar `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared`
3. Copiar o schema Prisma da seção 11 do CLAUDE.md para `apps/api/prisma/schema.prisma`
4. Campos de blockchain (`contractHash`, `blockchainTxHash`, `blockchainNetwork`, `blockchainContractAddr`) devem ser `String?` — existem no schema, ficam null por agora
5. Rodar `prisma migrate dev --name init`
6. Implementar middleware de RLS
7. Configurar Tailwind + shadcn/ui no `apps/web`
8. Criar `.env.example` com todas as variáveis
9. Confirmar que `turbo run build` passa

Sinalize quando o Módulo 0 estiver completo.
