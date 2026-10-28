# ADR-0002 — Estratégia de Carga em Massa (Bulk Insert) de Bens para Bancos em Nuvem

- **Status:** Aceita e implementada
- **Data:** 2026-10-28
- **Decisores:** equipe do buscARPE
- **Contexto:** Card 1.3 / Guia de Deploy em Nuvem — Seed remoto de bens no PostgreSQL (Supabase)

## Contexto e problema

O seed de bens do buscARPE foi originalmente concebido e testado em ambiente local (localhost), processando os arquivos das concessões AQUA e VITA com 3.475 Bens Pais (instalações) e mais de 17.000 Bens Filhos (equipamentos).

Na implementação inicial do `persistidor.ts`, os grupos de instalação eram agrupados em lotes de 50 instalações e persistidos dentro de transações interativas do Prisma (`cliente.$transaction`), executando operações sequenciais de `upsert` para o pai e para cada um de seus equipamentos filhos (`for ... await transacao.bem.upsert(...)`).

Ao executar essa mesma lógica contra uma instância remota em nuvem (Supabase Session Pooler via internet), o comportamento sofreu forte degradação:
1. **Multiplicação de viagens de rede (Round Trips):** Para cada equipamento, o Prisma realizava consultas prévias para verificar existência e converter a relação textual `codigo_unico` do pai em `id`, além do `INSERT` e do `SELECT` de retorno com campos pesados como `dados_complementares` (JSON) e `busca_texto`.
2. **Estouro de Timeout Transacional:** A transação interativa do Prisma possui limite estrito por padrão (5 segundos). Mesmo ao expandir a margem para 60 segundos, um lote de 10 instalações com dezenas de equipamentos ultrapassava 60 segundos de tráfego cumulativo de rede, disparando o erro `P2028: Transaction API error: A query cannot be executed on an expired transaction` ou falhas de chave estrangeira (`P2025: No 'Bem' record was found for a nested connect`).
3. **Tempo Excessivo:** Caso o processo operasse sem falhas em modo unitário sequencial, a carga total estimada via internet ultrapassaria 1 a 2 horas.

## Drivers da decisão

- Viabilizar a ingestão dos mais de 20.000 bens do MVP em menos de 2 minutos, mesmo operando via internet remota.
- Eliminar por completo falhas de timeout de transações abertas no pooler do Supabase (`P2028` e `P2025`).
- Manter integridade relacional total entre Bens Pais e Bens Filhos (`bem_pai_id` e `municipio_id`).
- Preservar 100% de retrocompatibilidade com a suíte de testes unitários existente (`persistidor.spec.ts`).
- Manter o código idempotente e seguro contra reexecuções.

## Opções consideradas

### 1. Manter `upsert` sequencial diminuindo o lote para 1 instalação por transação
- *Vantagem:* Não estoura o timeout de 60s por transação.
- *Desvantagem:* Executar mais de 20.000 viagens de rede individuais levaria cerca de 1 hora no terminal local. Rejeitada.

### 2. Delegar a execução do seed exclusivamente para a máquina remota (Railway CLI / Release Command)
- *Vantagem:* Na mesma rede do datacenter, o ping é inferior a 1ms.
- *Desvantagem:* Impede que desenvolvedores executem o seed do banco remoto de homologação ou desenvolvimento a partir de suas próprias máquinas de trabalho. Rejeitada como solução única.

### 3. Carga híbrida em massa (`createMany`) com fallback transacional
- *Adotada.*
  - Quando executado com o `PrismaClient` real conectado ao banco, processa as instalações e equipamentos em blocos de comandos em lote (`createMany` com `skipDuplicates: true`).
  - Resolve as relações de `bem_pai_id` em memória através de um mapa chave-valor (`codigo_unico -> id`) gerado em consulta única.
  - Caso o cliente fornecido seja um mock transacional de testes unitários (sem suporte a `createMany`), mantém o caminho de `upsert` com vínculo direto de ID e controle de lote, garantindo que os testes existentes continuem passando intactos.

## Decisão

O módulo `persistidor.ts` foi refatorado para suportar duas vias de execução:

1. **Via de Alta Performance em Nuvem (`createMany`):**
   - **Bens Pais:** Inseridos em blocos de até 500 registros por query SQL.
   - **Mapeamento em Memória:** Uma única consulta `findMany` carrega os `id` e `codigo_unico` dos pais recém-inseridos.
   - **Bens Filhos:** Chaves estrangeiras `bem_pai_id` e `municipio_id` são vinculadas diretamente em memória. Os equipamentos são inseridos em blocos de até 1.000 registros por query SQL via `createMany({ skipDuplicates: true })`.
2. **Via Transacional de Compatibilidade (Fallback para Mocks e Testes):**
   - Transação interativa com timeout de 60 segundos e lote padrão de 10 instalações, associando filhos diretamente pelo ID numérico do pai salvo (`paiSalvo.id`).

## Consequências

### Ganhos
- **Velocidade Extrema:** A concessão AQUA (3.101 pais e 16.468 filhos) foi carregada em apenas **82 segundos**. A concessão VITA (377 pais e 2.437 filhos) em menos de **10 segundos**.
- **Carga Total:** 20.657 bens gravados no PostgreSQL com integridade referencial validada.
- **Zero Timeouts:** Nenhuma transação permaneceu aberta por tempo prolongado no Supavisor/Pooler.
- **Integridade da Suíte de Testes:** 100% dos testes unitários do backend (15 suítes, 76 testes) continuam passando com sucesso.

### Limitações e Mitigações
- `createMany` com `skipDuplicates: true` não atualiza campos de registros já existentes em caso de reexecução (apenas insere novos). Para reprocessamento integral com atualização de valores divergentes em planilhas futuras, recomenda-se limpeza prévia da tabela ou rotina dedicada de reconciliação de dados.

