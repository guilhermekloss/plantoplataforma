# Plano técnico — Dados de campo & IoT (MVP com feeds simulados)

> **Status: implementado (Etapas 0–5) em 2026-07-03.** Providers em
> `apps/api/src/field-data/providers/`, endpoints novos no `field-data`,
> selo de verificação no marketplace e e2e cobrindo tudo
> (`field-data.e2e-spec.ts`, `field-data-events.e2e-spec.ts`, `offers.e2e-spec.ts`).
> UI concluída em 2026-11-13: cards de NDVI/estimativa e termometria do silo,
> preço-alvo e "Simular colheita" em Meu campo; selo de verificação no Mercado.

> Objetivo: transformar os dados do módulo **Meu campo** de painéis passivos em
> **automações que disparam ação** (criar lote, alertar desconto, sugerir oferta),
> sem integrar APIs reais nesta fase. Cada fonte externa vira um **provider
> simulado** que espelha o contrato da API real — na Fase 03 troca-se a
> implementação, não os consumidores.
>
> As APIs reais que cada provider espelha estão documentadas no
> [README § Integrações de dados](../README.md#integrações-de-dados-simuladas-no-mvp).

## Princípios

1. **Provider pattern.** Toda fonte externa é uma interface em
   `apps/api/src/field-data/providers/`, com implementação simulada agora e real
   na Fase 03. `simulated-feeds.ts` já faz isso para clima e cotações — o plano
   generaliza o padrão.
2. **Determinístico por dia.** Simulações reutilizam `rng`/`dayKey`
   (mulberry32) para a demo ficar estável dentro do mesmo dia.
3. **Rótulo honesto.** Todo feed simulado carrega `source` com sufixo
   `— simulado no MVP`, como já ocorre (`Estação INMET A819 (Cascavel) — simulado no MVP`).
4. **Dado só entra se terminar em decisão.** Cada etapa abaixo liga uma fonte a
   uma ação num fluxo existente (Meu campo, Produção, Mercado, Assistente).

## Arquitetura alvo

```
apps/api/src/field-data/
  providers/
    market.provider.ts      # cotações (hoje: marketQuotes)      → real: CEPEA/B3
    weather.provider.ts     # previsão 7d (hoje: weatherForecast) → real: Open-Meteo/INMET
    satellite.provider.ts   # NOVO — série NDVI + estimativa pré-colheita → real: Sentinel-2/EOSDA
    telemetry.provider.ts   # NOVO — eventos de colheita/plantio  → real: John Deere Ops Center/FieldView
    silo.provider.ts        # NOVO — termometria (série temporal) → real: Procer/QualyAgro
  climate-intelligence.ts   # (existente) risco clima × prazo de contrato
  field-data.service.ts     # orquestra providers + Prisma
```

Cada provider exporta a interface que a integração real implementará
(ex.: `TelemetryProvider.pullHarvestEvents(orgId): HarvestEvent[]`). O service
não sabe se o dado é simulado.

## Etapas

### Etapa 0 — Refatoração sem mudança de comportamento

Extrair `marketQuotes` e `weatherForecast` de `simulated-feeds.ts` para
`providers/market.provider.ts` e `providers/weather.provider.ts`, mantendo
`rng`/`dayKey` num `providers/simulation.ts` compartilhado. `field-data.service.ts`
passa a depender das interfaces. Testes existentes (`field-data.e2e-spec.ts`)
devem passar sem alteração.

### Etapa 1 — Satélite/NDVI: estimativa pré-colheita → oferta antecipada

**Fonte simulada:** `satellite.provider.ts` gera série NDVI quinzenal do ciclo
(curva logística com ruído determinístico: emergência → pico ~0.85 → senescência)
por lote `em_desenvolvimento`.

**Automação:** para lotes em desenvolvimento, calcular
`estimatedYieldSacksPerHa` (NDVI de pico × fator por cultura, com faixa de
confiança) e expor em `cropView.satellite`. O agente `/ai/suggest-contracts`
passa a considerar lotes **ainda não colhidos** e sugere oferta a termo com o
volume estimado (marcada como `estimada`, exigindo confirmação do produtor).

**Persistência:** sem migração — série vai em `FieldReading.climateData.ndviSeries`
(Json já existente) ou campo novo `satelliteData Json?` se preferir separar.

### Etapa 2 — Termometria de silo × cláusula de desconto do contrato

**Fonte simulada:** `silo.provider.ts` gera histórico de 14 dias de
`grainTempC`/`ambientTempC`/`intergranularMoisturePct` por silo (tendência de
aquecimento em ~20% dos casos, seed determinística).

**Automação (o diferencial do Plantor):** cruzar a tendência com a grade de
desconto por qualidade que já existe em `packages/shared`:
projetar a umidade/qualidade na data de entrega dos contratos em aberto e, se a
projeção cair de faixa, emitir alerta com **impacto em R$**:
"Se a temperatura do Silo A continuar subindo, o lote sai da faixa X para Y na
entrega do contrato Nº 123 — desconto estimado de R$ Z. Acione a aeração ou
antecipe a entrega." Entra na régua de alertas existente
(`weather.alerts`) e vira notificação (módulo `notifications`).

**Persistência:** `storage.history: [{ at, grainTempC, ambientTempC, moisturePct }]`
dentro do Json `storage` já existente — sem migração.

### Etapa 3 — Telemetria de colheita: lote nasce sozinho

**Fonte simulada:** `telemetry.provider.ts` expõe `pullHarvestEvents(orgId)`
com eventos no formato que o webhook real da OEM enviaria:

```ts
interface HarvestEvent {
  externalId: string;        // id do evento na OEM (idempotência)
  machine: string;           // "Colheitadeira John Deere S790"
  grainType: GrainType;
  areaHa: number;
  yieldSacksPerHa: number;
  harvestMoisturePct: number;
  fuelLPerHa: number;
  finishedAt: string;        // ISO
}
```

**Automação:** endpoint `POST /field-data/events/harvest` (guardado por RBAC,
no MVP acionado pelo seed e por um botão "Simular colheita" em dev) faz upsert
de `FieldReading` com `status: colhido`, `source: "John Deere Operations Center — simulado no MVP"`
e os dados do evento. O funil de **Produção** passa a mostrar o lote sem
digitação do produtor. Idempotente por `externalId` (guardar em `machineData.externalId`).

### Etapa 4 — Sinal de venda: preço-alvo × break-even

**Automação:** produtor define preço-alvo por cultura
(`PATCH /field-data/target-price`, persistido em `Organization.farmProfile.targetPrices`
— Json existente, sem migração). Um check diário (no MVP, computado na leitura
do overview; Fase 03, job) compara cotação do `market.provider` com alvo e
break-even (`sellDecision` já calcula) e emite notificação:
"Soja atingiu R$ X — R$ Y acima do seu break-even. Criar oferta?" com CTA para
o fluxo de oferta existente. É o padrão validado pela "AIrton" da Grão Direto.

### Etapa 5 — Lote verificado no Mercado

**Automação:** ao montar `GET /offers/marketplace`, derivar (sem migração)
`verification: 'sensores' | 'declarado'` — `sensores` quando o `FieldReading`
de origem tem dados de telemetria (`machineData`), termometria (`storage.history`)
e NDVI. A UI do Mercado mostra selo "Dados verificados por sensores" na oferta;
é o lastro auditável que reduz risco do comprador (mesma lógica da CPR verde).

## Resumo de mudanças

| Camada | Mudança (entregue) | Migração? |
|---|---|---|
| `field-data/providers/` | 5 providers + `simulation.ts` (PRNG compartilhado); `simulated-feeds.ts` removido | — |
| `FieldReading` | dados novos derivados na leitura — série NDVI e história do silo são **sintetizadas** pelos providers a partir dos campos existentes (`plantingDate`/`ndviAvg`, `storage`), sem persistir nada novo | Não |
| `Organization.farmProfile` | `targetPrices` no Json existente | Não |
| Endpoints | `POST /field-data/events/harvest` (webhook), `POST /field-data/events/harvest/simulate` (botão dev), `PATCH /field-data/target-price` | — |
| `offers.service` | campo derivado `verification` (`sensores` com ≥ 2 fontes) no marketplace | Não |
| `ai/suggest-contracts` | lotes `em_desenvolvimento` entram com volume estimado por satélite (`offerType: 'antecipada'`, `estimated: true`) | — |
| Seed | `targetPrices` nos `farmProfile` (São João: soja/trigo; Boa Vista: soja/milho) — o resto é sintetizado | — |
| Overview (`GET /field-data/overview`) | `crops[].satellite`, `crops[].storage.telemetry`, `crops[].storageRisk`, `market.quotes[].targetPriceCents/targetHit`, alertas novos (desconto projetado `urgente`, preço-alvo `info`) | — |

## Testes (implementados — 62 e2e verdes)

| Arquivo | Cobre |
|---|---|
| `field-data.e2e-spec.ts` | Overview base; satélite (série NDVI ≥ 2 pontos, estimativa > 0, faixa coerente) no lote em desenvolvimento; silo aquecendo (`trend.warming`, 14 pontos de história) × contrato de soja a 30 dias → `storageRisk` com desconto/impacto R$ > 0 e alerta `urgente` com "umidade projetada"; preço-alvo: PATCH persiste, `targetHit` no piso determinístico da série (10.625 = 0,85 × referência), alerta "Preço-alvo atingido", remoção do alvo e RBAC 403 para cooperativa; `POST /ai/suggest-contracts` devolve sugestão `antecipada` (trigo em desenvolvimento, `estimated: true`) e `imediata` (soja) |
| `field-data-events.e2e-spec.ts` | `POST /events/harvest` cria lote `colhido` com `machineData.externalId` e `source`; mesmo `externalId` → `created: false` sem duplicar; lote aparece no overview; RBAC 403 para cooperativa; payload inválido (harvestYear fora do formato) → 400; `POST /events/harvest/simulate?grain=milho` gera e ingere o evento |
| `offers.e2e-spec.ts` | Oferta sem sensores → `verification.level: 'declarado'`; lote com `machineData` + `storage` + `ndviAvg` → `'sensores'` com as três fontes listadas |

Notas de manutenção dos testes:
- Asserts de preço devem ser autoconsistentes com a cotação retornada
  (`pricing.indicativePriceCents`), nunca com o preço de referência fixo — o
  feed simulado é determinístico **por dia** e muda a cada dia.
- Para `targetHit` determinístico use alvo ≤ 10.625 (soja): é o piso da série
  simulada (0,85 × referência), garantido pelo `Math.max` do provider.
- Para disparar `trend.warming` num teste: `grainTempC ≥ 26` e
  `grainTempC − ambientTempC > 5` (assinatura de aquecimento espontâneo).
- A suíte e2e usa o Postgres do dev e apaga tudo — restaurar a demo exige
  truncar as tabelas e re-seedar (ver README § Testes).

## Fora deste plano (Fase 03+)

- Integrações reais (OAuth John Deere, tokens EOSDA/Procer, scraping/feed CEPEA).
- Jobs agendados (o MVP computa na leitura); WhatsApp para alertas proativos.
- Renegociação de prazo assistida (clima × contrato) — hoje fica no alerta.
- Blockchain/tokenização de lastro — o hash canônico existente cobre o MVP.
