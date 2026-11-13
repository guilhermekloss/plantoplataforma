# Plantor — Guia Completo do Projeto para Claude Opus

> **Leia este arquivo antes de qualquer tarefa.** Ele contém o contexto de negócio, domínio jurídico, modelo de dados, arquitetura blockchain, integrações e regras de desenvolvimento. Toda decisão técnica deve ser compatível com o que está aqui.

---

## 1. O que é o Plantor

Plataforma SaaS B2B com infraestrutura blockchain para **automatização, rastreabilidade e liquidação de contratos de grãos** no agronegócio brasileiro.

Conecta produtores rurais, cooperativas e tradings com conformidade e rastreabilidade ponta a ponta — eliminando processos manuais, fraudes e dependência bancária.

**Tagline:** Conformidade, agilidade e confiança em toda a cadeia.

---

## 2. Problema que resolve

### Cenário atual (dores reais com impacto financeiro)

| Dor | Impacto Financeiro Estimado |
|-----|-----------------------------|
| Gestão manual e retrabalho (planilhas, conciliação) | R$ 960 mil/ano para equipe de 10 pessoas |
| Erros operacionais e compliance (multas) | ≥ R$ 500 mil/ano evitando 1 autuação |
| Dependência de bancos (juros 1,5–2,5% ao mês) | R$ 15–30 milhões/ano para empresa com R$ 1 bi/ano em operações |
| Perdas em logística (atrasos, entregas parciais) | R$ 10–20 milhões/ano (1–2% do volume) |
| Disputas judiciais | R$ 1–5 milhões por processo |

**Dados de mercado:** disputas judiciais no agronegócio somaram **R$ 13,3 bilhões em 2023** (CAM-CCBC). Inadimplência do produtor rural pessoa física atingiu **7,6% em 2024** (Serasa Experian).

### Por que o problema persiste

- Contratos mal redigidos com cláusulas ambíguas (sem padronização)
- Assimetria de informação entre produtor e comprador (trading/cooperativa)
- Produtores em posição de adesão: sem poder de barganha real
- Falta de visibilidade da cadeia (logística, entrega, qualidade)
- Volatilidade de preços gera incentivo para quebra estratégica de contrato (cláusula wash out)

---

## 3. Solução — O que a Plantor faz

**Fluxo central do produto:**
1. Trading ou cooperativa **cria o contrato** na Plantor (parametrizado, com regras de qualidade e penalidades)
2. O produtor **acessa e aceita** o contrato digitalmente
3. A Plantor **gera o documento jurídico** (CPR ou contrato padrão) e **registra on-chain**
4. Eventos de execução (entrega, qualidade, pagamento) são **automatizados via smart contract**
5. Timeline auditável disponível para todas as partes

**Os 4 pilares da plataforma:**
- **Painel SaaS** — criação e gestão de contratos com assinatura digital
- **Blockchain layer** — registro imutável, smart contracts para execução automática
- **Dashboard multiator** — cooperativas, tradings e produtores têm visões diferenciadas
- **Integrações ERP** — TOTVS, SAP, Grão Direto (a partir da Fase 03)

### Como a Plantor resolve os 10 riscos principais do setor

| Risco | Solução Plantor |
|-------|----------------|
| Volatilidade de preços → inadimplência | Correção de preços dinâmica: renegociação online em contratos ativos |
| Pagamento sem entrega real | Pagamento proporcional à entrega — smart contract libera conforme confirmação |
| Produto fora das especificações | Regras de qualidade parametrizadas no contrato; ajuste automático de preço |
| Baixo poder de barganha do produtor | Mercado aberto de ofertas: cooperativas/tradings publicam e produtores escolhem |
| Assimetria de informação | Blockchain: fonte única da verdade, imutável e auditável |
| Contratos ambíguos e insegurança jurídica | Contrato como algoritmo: regras de negócio digitais, sem margem para interpretação |
| Rigidez contratual (eventos imprevisíveis) | Gatilhos automáticos: cláusulas se adaptam a índices de mercado pré-configurados |
| Contratos de adesão (assimetria de poder) | Transparência visual das cláusulas e riscos — produtor negocia com base em dados |
| Descaracterização jurídica do contrato | Dossiê digital rastreável comprova a natureza real da relação comercial |
| Incerteza sobre safra futura | Integração com sensores/drones; reportes periódicos da lavoura no contrato |

---

## 4. Mercado e Modelo de Negócio

**Tamanho do mercado:**
- Produção nacional estimada em R$ 3,79 trilhões até 2025
- Safra 2024/25: 350,2 milhões de toneladas (recorde histórico, +16,3%)
- Agronegócio = ~29,4% do PIB brasileiro; 50% das exportações totais
- PR + MT = 43% da produção nacional → mercado-alvo inicial

**Adoção digital no campo:**
- 76% dos produtores rurais já usam WhatsApp para negociar
- 71% dos domicílios rurais conectados (2021); 5G chegando ao interior desde 2023

**Clientes piloto identificados:**
- **Cotrijal** (cooperativa média): faturamento estimado de R$ 8,9 bi em 2025
- **Fiagril** (trading média): receita ~R$ 5,6 bi/ano

**Modelo de receita (dual):**
- Licença anual SaaS: **R$ 5.000/cliente** (cooperativa ou trading)
- Taxa de transação: **0,01%** do valor movimentado
- Cada cliente atende em média 100 produtores; ticket médio por produtor: R$ 1 milhão/ano

**ROI para os clientes (cenário conservador, 20% do potencial):**
- Cotrijal: investe R$ 505 mil → economiza R$ 1,6–2,4 milhões (3–5× retorno)
- Fiagril: investe R$ 1,005 milhão → economiza R$ 3,4–5,6 milhões (3–5× retorno)
- Com 2 clientes médios: **breakeven + lucro de R$ 310 mil/ano para a Plantor**

---

## 5. Time

- **Guilherme Kloss** — Product Strategist, 10+ anos em tech e negócios digitais. Expertise em Web3, fintech e mobilidade.

---

## 6. Roadmap de Implementação

| Fase | Descrição | Investimento | Duração |
|------|-----------|-------------|---------|
| **01 — ATUAL** | Validação (pilot com cooperativas) — **sem blockchain** | R$ 100 mil | 6 meses |
| 02 | Escala Inicial + Blockchain + CPR digital + WhatsApp | R$ 250 mil | 6 meses |
| 03 | Expansão Tecnológica (ERP + Oracle B3/CBOT) | R$ 500 mil | 8 meses |
| 04 | Internacionalização | R$ 1,2 milhão | 12 meses |
| 05 | Logística Inteligente (sensores, drones) | R$ 1 milhão | 10 meses |
| **Total** | | **R$ 3,05 milhões** | **42 meses** |

**Breakeven previsto ao final da Fase 4.**

**Concorrentes mapeados:**
- **Orbia (Bayer)**: acompanha o produtor do planejamento à venda, foco em insumos — sem blockchain nem contrato jurídico
- **Eattae**: ferramenta simples para pequenos produtores, sem blockchain nem juridicamente vinculante

---

## 7. Framework Jurídico Brasileiro

> Esta seção é crítica. Toda feature que envolva contrato, assinatura ou pagamento deve ser compatível com este framework.

### 7.1 CPR — Cédula de Produto Rural (Lei 8.929/94)

A **CPR é o principal instrumento jurídico para venda futura de grãos no Brasil**. A Plantor deve gerar CPRs como documento legal central, não apenas contratos genéricos.

**Tipos de CPR:**
- **CPR Física** — o emitente (produtor) se obriga a entregar o produto na data acordada
- **CPR Financeira** — liquidação em dinheiro pelo preço de mercado na data de vencimento (MP 2.017-1/2000)

**Características jurídicas da CPR:**
- É **título de crédito** (título executivo extrajudicial) — permite execução direta sem ação de conhecimento
- Pode ser registrada em **Cartório de Registro de Imóveis** (maior segurança jurídica)
- Pode ser **securitizada** via CRA (Certificado de Recebíveis do Agronegócio — Lei 11.076/04)
- É **irrevogável e irretratável** (CC/2002, art. 481)
- O emitente responde com todos os seus bens (CC/2002, art. 391)

**Campos obrigatórios de uma CPR válida (Lei 8.929/94, art. 3º):**
1. Nome "Cédula de Produto Rural"
2. Data e condições de entrega (ou liquidação)
3. Nome e qualificação do emitente (produtor) e do credor
4. Produto prometido: especificação, qualidade e quantidade
5. Local e condições de entrega
6. Descrição dos bens vinculados em garantia (se houver)
7. Data e lugar de emissão
8. Assinatura do emitente (produtor) ou representante legal

**Implicação para o MVP:** O sistema deve ser capaz de gerar um PDF de CPR válida com todos os campos acima, que pode ser assinada digitalmente pelas partes.

### 7.2 Assinatura Digital — Marco Legal no Brasil

- **MP 2.200-2/2001**: Define a ICP-Brasil e valida assinaturas digitais. Há dois tipos:
  - **Assinatura qualificada (ICP-Brasil)**: máxima validade jurídica, requer certificado digital (e-CPF, e-CNPJ)
  - **Assinatura eletrônica simples**: válida por lei quando houver aceite das partes e mecanismo de identificação (email, token, etc.)
- **Para o MVP**: assinatura eletrônica simples (click-to-sign) com registro de IP, timestamp, email e hash do documento é legalmente válida e suficiente
- **Para Fase 02**: integrar com ICP-Brasil via parceiros (DocuSign, ClickSign, ou Serpro)
- **Recomendação**: armazenar evidências de assinatura (IP, user-agent, timestamp, hash pré/pós-assinatura) para eventual litígio

### 7.3 LGPD — Lei Geral de Proteção de Dados (Lei 13.709/2018)

**Base legal para tratamento de dados:** art. 7º, V — "execução de contrato ou de procedimentos preliminares relacionados a contrato de que seja parte o titular"

**Classificações de dados no sistema:**
- **Dados pessoais comuns**: nome, CPF, email, telefone do produtor → precisam de proteção básica
- **Dados pessoais sensíveis**: dados financeiros, localização exata da propriedade → proteção reforçada
- **Dados on-chain**: APENAS hashes (jamais dados pessoais) → imutáveis, logo não podem ser apagados
- **Direito ao esquecimento**: o sistema deve permitir anonimização dos dados off-chain, mantendo apenas os hashes on-chain

**Controlador vs. Processador:**
- **Controlador**: a cooperativa/trading (define as finalidades do tratamento)
- **Processador**: a Plantor (trata dados em nome do controlador)
- Isso significa que a Plantor precisa de um **DPA (Data Processing Agreement)** nos termos de uso com cada cliente B2B

**Implementação obrigatória:**
- Consentimento explícito do produtor ao se cadastrar (aceite dos termos)
- Política de privacidade acessível no onboarding
- Log de acesso a dados sensíveis
- Possibilidade de exportação e exclusão de dados pessoais (DSAR — Data Subject Access Request)

### 7.4 Padrões de Qualidade de Grãos (MAPA)

Os parâmetros de qualidade são definidos pelo MAPA e devem estar pré-configurados no sistema como padrão.

**Soja — Instrução Normativa MAPA 11/2007:**

| Parâmetro | Tipo 1 (T1) | Tipo 2 (T2) | Tipo 3 (T3) | Fora de Tipo |
|-----------|-------------|-------------|-------------|--------------|
| Umidade máx | 14% | 14% | 14% | > 14% |
| Impurezas e mat. estranhas | ≤ 1% | ≤ 2% | ≤ 4% | > 4% |
| Avariados máx | ≤ 8% | ≤ 15% | ≤ 30% | > 30% |
| Esverdeados máx | ≤ 8% | ≤ 15% | ≤ 30% | > 30% |
| Quebrados máx | ≤ 30% | ≤ 30% | ≤ 30% | > 30% |
| Ardidos + brotados | ≤ 6% | ≤ 6% | ≤ 6% | > 6% |
| Peso específico (PH) | ≥ 660 g/L | ≥ 660 g/L | ≥ 660 g/L | < 660 g/L |

**Milho — Instrução Normativa MAPA 60/2011:**

| Parâmetro | Tipo 1 | Tipo 2 | Tipo 3 |
|-----------|--------|--------|--------|
| Umidade máx | 14% | 14% | 14% |
| Impurezas máx | ≤ 1% | ≤ 1,5% | ≤ 2% |
| Avariados máx | ≤ 6% | ≤ 12% | ≤ 18% |
| Quebrados máx | ≤ 2% | ≤ 3% | ≤ 6% |

**Impacto financeiro de não conformidade de umidade na soja:**
- Cada 1% acima de 14% de umidade → desconto de ~0,5–1% no preço
- Proposta MAPA de reduzir padrão para 13%: prejuízo estimado de **R$ 6,62 bilhões** para produtores (Aprosoja)

**Lógica de desconto no contrato (configurável):**
```
se umidade_entregue > umidade_contratada:
  fator_desconto = (umidade_entregue - umidade_contratada) * taxa_desconto_por_pct
  preco_final = preco_base * (1 - fator_desconto)
```

### 7.5 NFe — Nota Fiscal Eletrônica

- Toda movimentação de grãos exige NFe (emissora: geralmente o produtor ou a cooperativa)
- **CFOP relevantes**: 5.101/6.101 (venda de prod. rural p/ cooperativa), 7.101 (exportação)
- A Plantor deve armazenar a **chave de acesso da NFe** (44 dígitos) vinculada à entrega
- Validação via API SEFAZ (gratuita, disponível por estado)
- Não emite NFe — apenas armazena e valida a chave

### 7.6 CAR — Cadastro Ambiental Rural (Lei 12.651/2012)

- Obrigatório para todos os imóveis rurais
- Vincula o produtor ao seu talhão (polígono de terra) no SICAR
- Requerido para acesso a crédito rural e para exportações rastreáveis (moratória da soja)
- **A Plantor deve armazenar o número do CAR** no perfil do produtor
- Permite ao comprador verificar conformidade ambiental da origem
- Fase 02: integrar com API SICAR para validação em tempo real

---

## 8. Domínio de Contratos Agrícolas — O que o sistema precisa entender

### Estrutura de um contrato / CPR de grãos

```
Contrato / CPR
├── Partes
│   ├── Emitente/Vendedor (Produtor Rural): nome, CPF, endereço, inscrição estadual, CAR
│   └── Credor/Comprador (Trading ou Cooperativa): razão social, CNPJ, representante legal
│
├── Objeto
│   ├── Produto: tipo de grão (soja, milho, café, etc.)
│   ├── Quantidade: volume em sacas (1 saca = 60kg) ou toneladas
│   ├── Safra: ex. 2025/2026 (soja: jan–mar; milho 1ª: out–jan; milho 2ª: fev–jun)
│   └── Qualidade: padrão MAPA (umidade, avariados, impurezas, PH)
│
├── Vigência: data de início (assinatura) → data fim (entrega total)
│
├── Preço e Pagamento
│   ├── Tipo de fixação: preço fixo | média de mercado | indexado (B3, Chicago/CBOT)
│   ├── Moeda: R$/saca ou USD/bushel (exportação)
│   ├── Reajuste: IPCA ou IGPM anual
│   └── Adiantamento/Barter: comprador financia insumos contra produção futura
│
├── Condições de Entrega
│   ├── Local: armazém (nome + endereço completo)
│   ├── Prazo: data limite de entrega
│   └── Transporte: responsabilidade e custos (produtor ou comprador)
│
├── Penalidades e Inadimplemento
│   ├── Cláusula penal: % do valor total por descumprimento (típico: 10–20%)
│   ├── Cláusula wash out: diferença entre preço contratado e preço de mercado na data da quebra
│   ├── Teoria da imprevisão: revisão contratual por evento extraordinário (pandemia, desastre natural)
│   └── Rompimento: condições e consequências para cada parte
│
└── Disposições Gerais
    ├── Obrigações fiscais e previdenciárias de cada parte
    ├── Fiscalização de qualidade pelo comprador (laudo de classificação)
    ├── Caráter irrevogável e irretratável (CC/2002)
    └── Foro: comarca da cooperativa/trading (ou câmara arbitral do agro)
```

### Máquina de estados do contrato

```
rascunho
  → pendente_assinatura_comprador
    → pendente_assinatura_produtor
      → assinado
        → em_execucao
          → entregue_parcial  (entrega < quantidade contratada)
          → disputado         (conflito em qualidade ou entrega)
          → liquidado         (entrega completa + pagamento confirmado)
          → cancelado         (acordo mútuo ou inadimplência resolvida)
```

**Regra de transição:**
- Cada transição gera um `ContractEvent` no banco + uma transação on-chain
- Transições críticas (assinado → em_execucao, em_execucao → liquidado) exigem confirmação de ambas as partes

### Tipos jurídicos de risco do contrato
- **Emptio Spei** (venda da esperança): produtor assume risco total da existência da safra
- **Emptio Rei Speratae** (coisa esperada): se nada for colhido, contrato pode ser nulo
- **Wash Out**: se produtor vende no spot em vez de entregar, paga a diferença de preço de mercado

---

## 9. Decisões Arquiteturais — Perguntas Respondidas

> Estas decisões estão definidas. Não as questione sem justificativa técnica forte.

### 9.1 Blockchain Provider → **Fora do MVP; Polygon (PoS) na Fase 02**

**Justificativa:**
- O MVP valida o fluxo de negócio (contrato → assinatura → entrega → auditoria) sem necessidade de blockchain
- Adicionar Solidity + Hardhat + ethers.js no MVP adiciona complexidade sem validar o core do produto
- O schema do banco já reserva os campos `contractHash`, `blockchainTxHash`, `blockchainNetwork` como nullable — fácil de preencher na Fase 02
- Fase 02: Polygon PoS (EVM-compatible, gas fees < US$ 0,01/tx, testnet Amoy), com possível migração para L2 da Better Use Blockchain
- Fase 03: Chainlink Oracles para feeds de preço B3/CBOT

### 9.2 Assinatura Digital → **Click-to-sign para MVP; ICP-Brasil (ClickSign) na Fase 02**

**Justificativa:**
- Assinatura eletrônica simples é legalmente válida no Brasil (MP 2.200-2/2001) quando há:
  1. Identificação das partes (email + CPF)
  2. Timestamp auditável
  3. Hash do documento pré/pós-assinatura
  4. Log de IP e user-agent
- ClickSign e DocuSign têm API simples e integração ICP-Brasil para Fase 02
- Para o MVP: implementar sistema próprio de "click-to-sign" com todas as evidências acima
- **Armazenar sempre**: hash SHA-256 do PDF do contrato antes e após assinatura, IP, timestamp ISO 8601

### 9.3 Multi-tenant → **Shared database com Row-Level Security (RLS) via Prisma**

**Justificativa:**
- Mais simples de operar no MVP (não precisa de multiple DB instances ou schemas)
- PostgreSQL tem RLS nativo e robusto
- Com Prisma, implementar via middleware que injeta `organizationId` em todas as queries
- Separação de dados garantida por `tenant_id` em cada tabela crítica
- Migrar para DB por tenant apenas se houver cliente enterprise exigindo isolamento físico (Fase 04+)

**Implementação:**
```typescript
// Prisma middleware para RLS
prisma.$use(async (params, next) => {
  if (params.model && TENANT_SCOPED_MODELS.includes(params.model)) {
    params.args.where = { ...params.args.where, tenantId: ctx.tenantId };
  }
  return next(params);
});
```

### 9.4 Precificação Indexada → **Input manual no MVP; Oracle Chainlink na Fase 03**

**Justificativa:**
- Integrar feeds de preço da B3/CBOT em tempo real adiciona complexidade desnecessária no MVP
- Para MVP: o usuário informa o preço manualmente (com campo de referência de mercado como hint)
- Fase 03: Chainlink Data Feeds tem feeds para Corn (CBOT), Soybeans (CBOT), BRL/USD
- Fase 03: para B3, usar API da própria B3 ou data vendors (Refinitiv, Bloomberg API)

### 9.5 Módulo de Qualidade → **Incluir versão simplificada no MVP (sem automação de pagamento)**

**Justificativa:**
- Qualidade é parte central do valor da Plantor — não pode ficar de fora do MVP
- MVP: produtor ou cooperativa faz upload do laudo de classificação (PDF) + preenche os campos manualmente
- MVP: sistema calcula o desconto sugerido mas pagamento ainda é manual (fora da plataforma)
- Fase 02: smart contract executa o desconto automaticamente com base no laudo digitalizado

### 9.6 Billing da Plantor → **Invoice manual nos primeiros 6 meses; Stripe/Asaas na Fase 02**

**Justificativa:**
- No MVP, com 2–5 clientes piloto, invoice manual é aceitável e reduz complexidade
- Usar Asaas (brasileiro, suporte PIX) na Fase 02 para cobrança recorrente
- Stripe é opção para Fase 04 (internacionalização)

### 9.7 Notificações → **Email (Resend) para MVP; WhatsApp Business API na Fase 02**

**Justificativa:**
- Email via Resend (API simples, plano gratuito generoso, suporta React Email para templates)
- WhatsApp: 76% dos produtores negociam pelo WhatsApp — é crítico, mas adiciona complexidade
- Fase 02: Evolution API (open-source, auto-hospedado) ou Z-API para WhatsApp Business
- Notificações críticas para WhatsApp desde Fase 02: contrato pendente de assinatura, entrega confirmada, pagamento liberado

---

## 10. Stack Técnica — Definida

```
Frontend:   Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
Backend:    NestJS (Node.js) + TypeScript
ORM:        Prisma + PostgreSQL (Supabase para MVP, facilita RLS e storage)
Auth:       NextAuth.js (v5) + JWT + RBAC
Blockchain: *** FASE 02 *** (campos já reservados no schema)
Email:      Resend + React Email
Storage:    Supabase Storage (laudos PDF, contratos assinados)
Deploy:     Vercel (frontend) + Railway (API NestJS) + Supabase (DB + storage)
Monitoramento: Sentry (erros) + PostHog (analytics produto)
```

**Por que Supabase para MVP:**
- PostgreSQL gerenciado com RLS nativo
- Storage integrado para arquivos (laudos, contratos)
- Auth básico disponível como fallback
- Plano gratuito cobre o MVP com folga
- Migração para AWS RDS trivial na Fase 03 se necessário

---

## 11. Modelo de Dados Completo

### Entidades principais

```prisma
// schema.prisma

model Organization {
  id              String   @id @default(cuid())
  tenantId        String   @unique // mesmo que id para MVP
  type            OrgType  // cooperative | trading | producer
  name            String
  legalName       String?
  cnpj            String?  @unique
  cpf             String?  @unique  // pessoa física (produtor)
  stateRegistration String?
  carNumber       String?  // Cadastro Ambiental Rural
  email           String   @unique
  phone           String?
  whatsappNumber  String?
  address         Json     // { street, city, state, zip, country }
  bankAccount     Json?    // { bank, agency, account, pixKey }
  plan            PlanType @default(trial) // trial | starter | pro
  planExpiresAt   DateTime?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  users           User[]
  contractsAsSeller Contract[] @relation("seller")
  contractsAsBuyer  Contract[] @relation("buyer")
}

model User {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  email           String   @unique
  passwordHash    String
  name            String
  cpf             String?
  phone           String?
  role            UserRole // admin | operator | producer | viewer
  isActive        Boolean  @default(true)
  lastLoginAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  contractsCreated Contract[]
  events          ContractEvent[]
  signatures      ContractSignature[]
}

model Contract {
  id              String          @id @default(cuid())
  tenantId        String          // organizationId do comprador (cooperativa/trading)
  contractNumber  String          @unique // auto-gerado: PLT-2025-0001
  cprNumber       String?         // número da CPR gerada
  cprType         CprType?        // fisica | financeira
  status          ContractStatus  @default(rascunho)

  // Partes
  sellerId        String          // producer organization
  seller          Organization    @relation("seller", fields: [sellerId], references: [id])
  buyerId         String          // cooperative or trading organization
  buyer           Organization    @relation("buyer", fields: [buyerId], references: [id])
  createdById     String
  createdBy       User            @relation(fields: [createdById], references: [id])

  // Objeto do contrato
  grainType       GrainType       // soja | milho | cafe | trigo | algodao | sorgo | feijao
  quantitySacks   Decimal         // quantidade em sacas
  sackWeightKg    Decimal         @default(60) // 60kg padrão
  harvestYear     String          // "2025/2026"
  harvestPeriod   HarvestPeriod   // primeira | segunda | unica

  // Qualidade — padrões MAPA
  grainGrade      GrainGrade?     // T1 | T2 | T3 (referência)
  maxMoisturePct  Decimal         @default(14.0)
  maxImpurityPct  Decimal         @default(1.0)
  minSpecificWeightGL Decimal?    // peso hectolítrico mínimo (g/L)
  maxDamagedPct   Decimal?
  qualityAdjType  QualityAdjType  // proportional | fixed_pct | rejection | none

  // Preço e Pagamento
  priceType       PriceType       // fixo | media_mercado | indexado_b3 | indexado_cbot
  priceValueCents BigInt?         // em centavos (BRL) ou millicents (USD)
  priceCurrency   Currency        @default(BRL)
  priceAdjIndex   PriceAdjIndex?  // IPCA | IGPM | none
  advancePct      Decimal?        // % de adiantamento (barter)
  barterDescription String?

  // Entrega
  warehouseName   String
  warehouseAddress Json            // { street, city, state, zip }
  deliveryDeadline DateTime
  transportResponsible TransportResp // seller | buyer

  // Penalidades
  penaltyPct      Decimal         @default(10.0) // % cláusula penal
  hasWashoutClause Boolean        @default(true)
  hasForceMajeure Boolean         @default(true)
  arbitrationForum String?        // ex: "CAM-CCBC" ou "Foro de Sorriso/MT"

  // Blockchain
  contractHash    String?         // SHA-256 do PDF do contrato
  blockchainTxHash String?        // tx de registro on-chain
  blockchainNetwork String?       // polygon-amoy | polygon-mainnet
  blockchainContractAddr String?  // endereço do smart contract

  // Datas de transição
  signedAt        DateTime?
  executionStartedAt DateTime?
  settledAt       DateTime?
  cancelledAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  signatures      ContractSignature[]
  events          ContractEvent[]
  deliveries      Delivery[]
  blockchainRecords BlockchainRecord[]

  @@index([tenantId, status])
  @@index([sellerId])
  @@index([buyerId])
  @@index([deliveryDeadline])
}

model ContractSignature {
  id              String   @id @default(cuid())
  contractId      String
  contract        Contract @relation(fields: [contractId], references: [id])
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  signerRole      SignerRole // seller | buyer | witness
  ipAddress       String
  userAgent       String
  documentHashBefore String  // SHA-256 antes da assinatura
  documentHashAfter  String  // SHA-256 após assinatura
  signedAt        DateTime @default(now())
}

model ContractEvent {
  id              String      @id @default(cuid())
  contractId      String
  contract        Contract    @relation(fields: [contractId], references: [id])
  eventType       EventType   // criado | assinado | em_execucao | entregue | liquidado | disputado | cancelado | laudo_anexado | ...
  description     String
  performedById   String?
  performedBy     User?       @relation(fields: [performedById], references: [id])
  blockchainTxHash String?
  metadata        Json?       // dados extras do evento
  createdAt       DateTime @default(now())

  @@index([contractId, createdAt])
}

model Delivery {
  id              String   @id @default(cuid())
  contractId      String
  contract        Contract @relation(fields: [contractId], references: [id])
  deliveryDate    DateTime
  quantitySacks   Decimal  // quantidade entregue nesta entrega
  nfeKey          String?  // chave de acesso da NFe (44 dígitos)
  warehouseReceiptNumber String? // número do recibo do armazém

  // Qualidade medida na entrega
  moisturePct     Decimal?
  impurityPct     Decimal?
  specificWeightGL Decimal?
  damagedPct      Decimal?
  qualityAccepted Boolean?
  priceAdjustmentPct Decimal? // % de desconto aplicado

  // Pagamento
  paymentAmountCents BigInt?  // valor a pagar por esta entrega
  paymentStatus   PaymentStatus @default(pendente) // pendente | liberado | pago
  paymentReleasedAt DateTime?
  pixTxId         String?     // ID da transação PIX

  blockchainTxHash String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  qualityReport   QualityReport?
}

model QualityReport {
  id              String   @id @default(cuid())
  deliveryId      String   @unique
  delivery        Delivery @relation(fields: [deliveryId], references: [id])
  reportNumber    String
  laboratoryName  String
  reportDate      DateTime

  // Análise
  moisturePct     Decimal
  impurityPct     Decimal
  specificWeightGL Decimal?
  damagedPct      Decimal?
  greenPct        Decimal?
  brokenPct       Decimal?
  ardinosPct      Decimal?
  grade           GrainGrade // T1 | T2 | T3 | fora_padrao

  fileUrl         String   // URL do PDF no Supabase Storage
  fileHash        String   // SHA-256 do PDF (para auditoria)
  createdAt       DateTime @default(now())
}

model BlockchainRecord {
  id              String   @id @default(cuid())
  contractId      String
  contract        Contract @relation(fields: [contractId], references: [id])
  recordType      BlockchainRecordType // contract_registered | status_changed | delivery_confirmed | payment_released | dispute_raised
  txHash          String   @unique
  blockNumber     BigInt?
  network         String
  gasUsed         BigInt?
  data            Json?    // payload enviado ao smart contract
  createdAt       DateTime @default(now())

  @@index([contractId])
}

// Enums
enum OrgType { cooperative trading producer }
enum UserRole { admin operator producer viewer }
enum ContractStatus { rascunho pendente_assinatura_comprador pendente_assinatura_produtor assinado em_execucao entregue_parcial disputado liquidado cancelado }
enum CprType { fisica financeira }
enum GrainType { soja milho cafe trigo algodao sorgo feijao }
enum HarvestPeriod { primeira segunda unica }
enum GrainGrade { T1 T2 T3 fora_padrao }
enum QualityAdjType { proportional fixed_pct rejection none }
enum PriceType { fixo media_mercado indexado_b3 indexado_cbot }
enum Currency { BRL USD }
enum PriceAdjIndex { IPCA IGPM none }
enum TransportResp { seller buyer }
enum SignerRole { seller buyer witness }
enum EventType { criado assinado_comprador assinado_produtor em_execucao entregue entregue_parcial laudo_anexado pagamento_liberado pagamento_pago disputado cancelado hash_registrado_onchain }
enum PaymentStatus { pendente liberado pago }
enum BlockchainRecordType { contract_registered status_changed delivery_confirmed payment_released dispute_raised }
enum PlanType { trial starter pro enterprise }
```

---

## 12. Arquitetura Blockchain — On-Chain vs. Off-Chain

### Princípio fundamental
**Dados pessoais e sensíveis NUNCA vão on-chain.** A blockchain armazena apenas hashes, status e eventos de negócio.

### O que vai on-chain (Polygon)

```
✅ Hash SHA-256 do PDF do contrato (bytes32)
✅ Mudanças de status do contrato (enum)
✅ Hash do laudo de qualidade na entrega (bytes32)
✅ Confirmação de entrega (quantidade + fator de ajuste de preço em bps)
✅ Liberação de pagamento (valor em wei/stablecoin)
✅ Abertura de disputa
✅ Timestamps de cada evento (block.timestamp)
```

### O que fica off-chain (PostgreSQL + Supabase)

```
❌ CPF, CNPJ, nome, endereço das partes
❌ Texto completo do contrato / CPR
❌ PDF do laudo de classificação
❌ Chave da NFe
❌ Dados bancários
❌ Localização da propriedade (CAR)
```

### Especificação do Smart Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title PlanторGrainContract
/// @notice Registra e gerencia o ciclo de vida de contratos de grãos on-chain
contract PlanтorGrainContract is AccessControl, Pausable {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");

    enum Status {
        Pending,          // aguardando assinaturas
        Signed,           // ambas as partes assinaram
        InExecution,      // em execução (entrega em andamento)
        PartialDelivery,  // entrega parcial registrada
        Disputed,         // em disputa
        Settled,          // liquidado
        Cancelled         // cancelado
    }

    struct ContractRecord {
        bytes32 contractHash;       // SHA-256 do PDF off-chain
        address sellerWallet;       // carteira do produtor (opcional no MVP)
        address buyerWallet;        // carteira da cooperativa/trading
        uint256 totalQuantitySacks; // quantidade total em sacas (x100 para 2 decimais)
        uint256 deliveredQuantitySacks;
        uint256 pricePerSackCents;  // preço por saca em centavos (BRL)
        uint256 deliveryDeadline;   // unix timestamp
        Status status;
        bool washoutClause;
        uint256 registeredAt;
    }

    mapping(bytes32 => ContractRecord) public contracts;
    mapping(bytes32 => bool) public contractExists;

    // Eventos — auditáveis e indexáveis
    event ContractRegistered(
        bytes32 indexed contractId,
        bytes32 contractHash,
        address indexed buyer,
        uint256 totalQuantitySacks,
        uint256 deliveryDeadline
    );
    event StatusChanged(
        bytes32 indexed contractId,
        Status oldStatus,
        Status newStatus,
        uint256 timestamp
    );
    event DeliveryConfirmed(
        bytes32 indexed contractId,
        bytes32 qualityReportHash,
        uint256 quantitySacks,
        uint256 priceAdjustmentBps, // 100 bps = 1%
        uint256 timestamp
    );
    event PaymentReleased(
        bytes32 indexed contractId,
        uint256 amountCents,
        uint256 timestamp
    );
    event DisputeRaised(
        bytes32 indexed contractId,
        address raisedBy,
        string reason,
        uint256 timestamp
    );
    event DisputeResolved(
        bytes32 indexed contractId,
        uint256 sellerShareBps,
        uint256 buyerShareBps,
        uint256 timestamp
    );

    // Funções
    function registerContract(
        bytes32 contractId,
        bytes32 contractHash,
        address buyerWallet,
        uint256 totalQuantitySacks,
        uint256 pricePerSackCents,
        uint256 deliveryDeadline,
        bool washoutClause
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused;

    function confirmSellerSignature(bytes32 contractId)
        external onlyRole(OPERATOR_ROLE);

    function startExecution(bytes32 contractId)
        external onlyRole(OPERATOR_ROLE);

    function confirmDelivery(
        bytes32 contractId,
        bytes32 qualityReportHash,
        uint256 quantitySacks,
        uint256 priceAdjustmentBps
    ) external onlyRole(OPERATOR_ROLE);

    function releasePayment(bytes32 contractId, uint256 amountCents)
        external onlyRole(OPERATOR_ROLE);

    function raiseDispute(bytes32 contractId, string calldata reason)
        external onlyRole(OPERATOR_ROLE);

    function resolveDispute(
        bytes32 contractId,
        uint256 sellerShareBps,
        uint256 buyerShareBps
    ) external onlyRole(ARBITRATOR_ROLE);

    function getContract(bytes32 contractId)
        external view returns (ContractRecord memory);
}
```

**Padrão de segurança:**
- `AccessControl` do OpenZeppelin: apenas o backend da Plantor (OPERATOR_ROLE) pode registrar eventos
- `Pausable`: permite pausar o contrato em emergências
- Nenhuma carteira de usuário final precisa ter ETH/MATIC no MVP — o backend paga o gas
- Usar wallet da Plantor como operador (custodial no MVP; não-custodial na Fase 03)

---

## 13. Módulos do MVP — Fase 01

### Prioridade de entrega

#### 1. Autenticação e Onboarding (Semanas 1–2)
- Cadastro de organização: cooperativa/trading (admin) ou produtor (convidado)
- Roles: `admin`, `operator`, `producer`
- Login com email/senha + JWT (NextAuth.js)
- **Convite de produtor**: cooperativa envia link mágico por email → produtor cria conta simplificada
- Proteção de rotas por role no middleware do Next.js

#### 2. Gestão de Contratos — core (Semanas 3–6)
- **Wizard de criação** em 5 etapas:
  1. Partes (selecionar produtor do catálogo ou convidar novo)
  2. Objeto (grão, quantidade, safra, qualidade MAPA)
  3. Preço e pagamento (tipo de fixação, moeda, adiantamento)
  4. Entrega e penalidades (armazém, prazo, wash out)
  5. Revisão + geração do PDF (CPR simplificada)
- **Assinatura digital** click-to-sign com registro de evidências
- **Máquina de estados** com todas as transições
- **Notificações por email** (Resend) em cada transição

#### 3. Dashboard por ator (Semanas 5–7)
- **Cooperativa/Trading:** lista de contratos + status + KPIs (volume total, contratos por status, entregas pendentes)
- **Produtor:** contratos pendentes de assinatura + contratos em andamento + histórico
- Filtros: status, grão, período, safra

#### 4. Gestão de Qualidade — simplificada (Semana 6–8)
- Upload de laudo de classificação (PDF) vinculado à entrega
- Campos manuais: umidade, impurezas, PH, avariados
- Sistema calcula desconto sugerido com base nas regras do contrato
- PDF e hash armazenados no Supabase Storage

#### 5. Rastreabilidade e Auditoria (Semana 7–8)
- Timeline visual de todos os eventos por contrato
- Exportação de relatório de auditoria em PDF (incluindo hash on-chain)
- Link para transação no explorador público (Polygonscan)

---

## 14. Integrações

### MVP (Fase 01)

| Integração | Propósito | Serviço |
|-----------|-----------|---------|
| Email transacional | Convites, notificações de status | Resend |
| Storage de arquivos | PDFs de contratos, laudos | Supabase Storage |
| Blockchain | Registro on-chain | Polygon Amoy (testnet) |
| Geração de PDF | CPR e contrato | `@react-pdf/renderer` ou `puppeteer` |

### Fase 02 (Escala Inicial)

| Integração | Propósito | Serviço |
|-----------|-----------|---------|
| WhatsApp | Notificações ao produtor (76% usam WA) | Evolution API (self-hosted) ou Z-API |
| Assinatura digital qualificada | ICP-Brasil para contratos de alto valor | ClickSign ou DocuSign BR |
| PIX | Liquidação de pagamentos | Asaas ou Celcoin (BaaS) |
| NFe | Validação de chave de acesso | API SEFAZ estadual (gratuita) |
| CAR | Validação de conformidade ambiental | SICAR API (IBAMA) |

### Fase 03 (Expansão Tecnológica)

| Integração | Propósito | Serviço |
|-----------|-----------|---------|
| Price Oracle | Cotações B3/CBOT on-chain | Chainlink Data Feeds |
| B3 | Cotações MILHO_FUTURO, BOIDALRIO | API B3 ou data vendor |
| CBOT | Soybeans, Corn, Wheat futuros | CME Group API |
| TOTVS Protheus | ERP de cooperativas | API REST TOTVS |
| SAP AgriModule | ERP de tradings grandes | SAP Integration Suite |
| Grão Direto | Marketplace de grãos | API parceria |

---

## 15. UX e Experiência do Usuário

### Princípios por ator

**Cooperativa/Trading (admin/operator):**
- Interface desktop-first (trabalham em escritório)
- Fluxo de criação de contrato em wizard — não em formulário único
- Visão consolidada de todos os contratos com alertas proativos
- Exportação de dados em CSV/Excel para conciliação com ERP

**Produtor:**
- **Mobile-first** — acessa pelo celular no campo
- Onboarding simples: recebe link por email/WhatsApp → cadastra CPF + senha → pronto
- Visualização clara do contrato antes de assinar: resumo visual (não só PDF)
- Interface em linguagem simples (evitar termos jurídicos sem explicação)
- Notificações via WhatsApp (Fase 02) → email (MVP)

### Fluxo crítico de assinatura (UX)

```
1. Produtor recebe email: "Novo contrato aguarda sua assinatura"
2. Clica no link → autenticado automaticamente pelo magic link
3. Vê resumo visual do contrato:
   - Quantidade e grão
   - Preço (em R$/saca, valor total estimado)
   - Data limite de entrega
   - Penalidades em destaque (wash out, cláusula penal)
4. Botão "Ver contrato completo" → abre PDF
5. Checkbox: "Li e concordo com os termos"
6. Botão "Assinar contrato" → confirmação → email de confirmação
7. Hash registrado on-chain automaticamente
```

### Alertas proativos (dashboard cooperativa)

- ⚠️ Contratos com vencimento em < 30 dias sem entrega iniciada
- 🔴 Produtor inadimplente (entrega não registrada após deadline)
- 📋 Contratos aguardando assinatura do produtor há > 3 dias
- ✅ Entregas confirmadas aguardando liberação de pagamento

---

## 16. Regras de Desenvolvimento

### Princípios inegociáveis

1. **Dados sensíveis de produção NÃO vão on-chain** — apenas hashes e eventos de status
2. **Segurança em camadas** — JWT + roles; RLS no banco; dados de produtores isolados por tenant
3. **MVP primeiro** — versão mais simples que demonstra o valor central antes de qualquer complexidade adicional
4. **LGPD by design** — não coletar dados além do necessário; armazenar evidências de consentimento
5. **Questionar escopo** — antes de implementar, confirme se é Fase 01 ou além

### Estrutura de pastas (monorepo — Turborepo)

```
plantor/
├── apps/
│   ├── web/                    # Next.js 14 (App Router)
│   │   ├── app/
│   │   │   ├── (auth)/         # login, cadastro, magic link
│   │   │   ├── (dashboard)/    # área logada
│   │   │   │   ├── contracts/  # lista + criação + detalhe
│   │   │   │   ├── deliveries/ # gestão de entregas
│   │   │   │   └── settings/   # org settings
│   │   │   └── api/            # API routes Next.js (auth, webhooks)
│   │   └── components/
│   │       ├── contracts/      # ContractWizard, ContractCard, ContractTimeline
│   │       ├── quality/        # QualityReportUpload, QualityAdjustment
│   │       └── ui/             # shadcn/ui components
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── auth/           # JWT, guards, decorators
│       │   ├── contracts/      # module: service, controller, dto
│       │   ├── deliveries/     # module: service, controller, dto
│       │   ├── organizations/  # module: service, controller
│       │   ├── blockchain/     # service: polygon interaction
│       │   ├── notifications/  # service: email (Resend)
│       │   ├── storage/        # service: Supabase storage
│       │   └── prisma/         # PrismaService + middleware RLS
│       └── prisma/
│           └── schema.prisma
├── packages/
│   ├── contracts/              # Smart contracts Solidity
│   │   ├── contracts/
│   │   │   └── PlanтorGrainContract.sol
│   │   ├── scripts/            # deploy scripts (Hardhat)
│   │   └── test/
│   ├── shared/                 # Types, DTOs, utils compartilhados
│   │   ├── types/              # ContractStatus, GrainType, etc.
│   │   └── utils/              # formatCurrency, formatSacks, etc.
│   └── ui/                    # Design system base (se necessário)
├── docs/
│   ├── adr/                   # Architecture Decision Records
│   └── domain/                # Glossário do domínio agro
└── CLAUDE.md                  # Este arquivo
```

### Idioma do código

- Comentários: português onde o domínio for específico do agro
- Nomenclatura de variáveis/funções: inglês
- Mensagens de erro e log: inglês
- Documentação técnica (ADRs, README): português
- Strings de UI: português (usuário final é brasileiro)

### Testes

- Testes unitários nos serviços críticos: `ContractService`, `QualityService`, `BlockchainService`
- Testes de integração nos fluxos principais: criação → assinatura → entrega → hash on-chain
- **Nunca mockar o banco de dados** em testes de integração — usar PostgreSQL em Docker
- Testes de snapshot para geração de PDF (CPR)
- Smart contracts: 100% de cobertura de branches (Hardhat + Chai)

### Segurança

- Senhas: bcrypt com salt rounds ≥ 12
- Tokens JWT: expiração de 7 dias para refresh token, 15 min para access token
- CORS: lista explícita de origens permitidas
- Rate limiting: 100 req/min por IP (NestJS Throttler)
- Uploads: validar MIME type + tamanho máximo 10MB para laudos
- Variáveis de ambiente: nunca hardcoded, sempre via `.env` (validado com Zod no startup)
- Wallet privada do operador blockchain: armazenar no AWS Secrets Manager ou similar (não em `.env`)

---

## 17. Glossário do Domínio

| Termo | Definição |
|-------|-----------|
| CPR | Cédula de Produto Rural — título de crédito para venda futura de grãos (Lei 8.929/94) |
| Saca | Unidade de medida padrão: 60kg |
| Safra | Ciclo anual de produção. Soja: jan–mar; Milho 1ª: out–jan; Milho 2ª: fev–jun |
| PH | Peso hectolítrico — densidade do grão (g/L). Indica qualidade |
| Wash Out | Cláusula que obriga o produtor inadimplente a pagar a diferença entre o preço contratado e o preço de mercado na data da quebra |
| Barter | Troca de insumos por produção futura (comprador financia o plantio) |
| Laudo de Classificação | Documento emitido por laboratório credenciado MAPA com os parâmetros físicos do grão entregue |
| CAR | Cadastro Ambiental Rural — registro obrigatório de imóveis rurais no SICAR |
| NFe | Nota Fiscal Eletrônica — documento fiscal obrigatório em toda movimentação de grãos |
| Teoria da Imprevisão | Princípio jurídico que permite revisão de contrato em eventos extraordinários (CC/2002, art. 478) |
| Emptio Spei | "Venda da esperança" — comprador assume risco da inexistência da safra |
| Talhão | Subdivisão de uma propriedade rural com características homogêneas de solo/cultura |
| CRA | Certificado de Recebíveis do Agronegócio — securitização de CPRs |
| SISBOV | Sistema de Identificação e Certificação de Bovinos (rastreabilidade bovina) |
| MAPA | Ministério da Agricultura, Pecuária e Abastecimento |
