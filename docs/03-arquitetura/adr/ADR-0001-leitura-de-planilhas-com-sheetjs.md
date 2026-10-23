# ADR-0001 — Leitura de CSV e XLSX com SheetJS CE

- **Status:** Aceita e implementada
- **Data:** 2026-10-23
- **Decisores:** equipe do buscARPE
- **Contexto:** Card 1.3 — ingestão local da planilha de bens

## Contexto e problema

O seed do buscARPE precisa ler arquivos CSV e XLSX, localizar cabeçalhos definidos em `seed-config.ts`, preservar os valores das colunas e converter cada registro para um formato comum antes do agrupamento de equipamentos e da montagem dos Bens Pais e Filhos.

A implementação anterior utilizava ExcelJS tanto para XLSX quanto para CSV. A árvore de dependências dessa biblioteca incluía `uuid@8.3.2`, associada a um advisory moderado. O relatório de auditoria indicava que a correção automática exigiria rebaixar ExcelJS para a versão 3.4.0, uma mudança major incompatível e indesejada. Também foi identificada a dependência de desenvolvimento `@nestjs/mau`, não utilizada pelos scripts nem pelo código do repositório, cujo grafo transitivo incluía advisories em `undici` e outras dependências.

Era necessário retirar dependências dispensáveis e escolher uma biblioteca de planilhas que atendesse à leitura do seed, tivesse versão corrigida verificável e mantivesse o formato interno já utilizado pelo processamento.

## Drivers da decisão

- Ler CSV e XLSX no mesmo leitor do seed.
- Manter cabeçalhos configuráveis, conversão de coordenadas e estrutura interna das linhas.
- Evitar uma atualização major forçada ou um downgrade incompatível de ExcelJS.
- Usar uma versão corrigida e fixada, cuja integridade seja registrada no lockfile.
- Manter a solução simples, sem adicionar um parser CSV separado para esta etapa do MVP.
- Tornar explícito o impacto de memória e o limite de confiança das planilhas processadas.

## Opções consideradas

### 1. Manter ExcelJS e aceitar ou contornar o advisory de `uuid`

Preservaria o leitor existente, mas manteria uma dependência transitiva reportada pelo audit. O downgrade sugerido pelo npm foi rejeitado por ser uma mudança major para trás.

### 2. Instalar `xlsx` diretamente do npm registry

Rejeitada. Na data da decisão, o registry npm disponibilizava `xlsx@0.18.5`, versão anterior às correções de segurança publicadas pela SheetJS. Os advisories públicos incluem prototype pollution ao ler arquivos especialmente construídos (CVE-2023-30533) e ReDoS (CVE-2024-22363).

### 3. Adotar SheetJS CE pelo tarball oficial

Adotada. A versão 0.20.3 é instalada pelo URL oficial da SheetJS, e não pelo pacote desatualizado do registry. O mesmo parser lê CSV e XLSX, removendo ExcelJS e sua cadeia `uuid`.

### 4. Usar SheetJS para XLSX e adicionar um parser CSV em streaming

Seria possível manter a leitura incremental do CSV, mas exigiria outra dependência e dois caminhos de parsing. Foi rejeitada para o escopo atual, que favorece uma implementação menor.

## Decisão

O seed utilizará **SheetJS Community Edition 0.20.3** para ler tanto CSV quanto XLSX. A dependência será fixada no `backend/package.json` pelo tarball oficial:

```text
https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

O lockfile registra a URL e o hash de integridade do pacote. O leitor converte a primeira planilha ou o conteúdo CSV em linhas e células, valida os cabeçalhos contra `seed-config.ts` e mantém o tipo `LinhaBemPlanilha` esperado pelas etapas seguintes.

Como limpeza correlata, `@nestjs/mau` foi removida das dependências de desenvolvimento por não ter uso encontrado no projeto. Essa remoção não é requisito funcional do leitor.

## Consequências

### Ganhos

- Remove ExcelJS e sua dependência transitiva `uuid` do caminho de produção.
- Remove `@nestjs/mau` e o caminho de desenvolvimento que incluía `undici`, `inquirer` e dependências transitivas vulneráveis.
- Usa uma versão corrigida do SheetJS CE em vez do pacote desatualizado do npm registry.
- Mantém uma única biblioteca para CSV e XLSX e o mesmo formato interno do seed.
- Na validação da implementação, os testes do seed, build, checagem TypeScript e Oxlint passaram; `npm audit` reportou zero vulnerabilidades.

### Trade-offs e perdas

- CSV e XLSX são carregados inteiramente em memória; o uso de memória cresce com o tamanho do arquivo. Isso substitui o comportamento incremental que seria possível com um parser CSV em streaming.
- A instalação depende da disponibilidade do CDN oficial da SheetJS. O lockfile fixa a origem e a integridade, mas clones e CI precisam conseguir acessar esse endereço.
- A SheetJS mantém distribuição própria do pacote corrigido; não se pode substituir o URL pelo `xlsx` do registry, pois este estava desatualizado na data desta decisão.
- O formato comum do leitor permanece dependente dos comportamentos de parsing do SheetJS, que devem ser cobertos por testes sempre que se atualizar a biblioteca.

## Segurança e limites de uso

- A versão adotada foi verificada contra o `npm audit` na data da implementação; o resultado não garante ausência de vulnerabilidades futuras.
- A leitura é destinada a arquivos locais e controlados do processo de seed. A seleção desta biblioteca não autoriza receber arquivos de usuários ou processar planilhas arbitrárias em uma rota pública.
- Se o requisito mudar para upload de planilhas, será necessária uma análise específica de ameaça, limites de tamanho/recursos, validação de conteúdo e isolamento do processamento.

## Validação e critérios de revisão

Na implementação inicial:

- Os testes do seed passaram (24 testes).
- O build do backend, a checagem TypeScript, o Oxlint e a formatação passaram.
- `npm audit` reportou zero vulnerabilidades.

Revisar esta decisão se:

- planilhas crescerem a ponto de a leitura integral causar pressão de memória;
- a instalação por CDN se mostrar indisponível ou incompatível com CI/ambientes de implantação;
- a SheetJS CE publicar novas orientações ou advisories que afetem a versão adotada;
- o sistema passar a processar arquivos externos ou enviados por usuários.

## Referências

- [Instalação oficial do SheetJS para Node.js](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)
- [Advisory GHSA-4r6h-8v6p-xvw6 / CVE-2023-30533 — Prototype Pollution](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)
- [Advisory GHSA-5pgg-2g8v-p4x9 / CVE-2024-22363 — ReDoS](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)
- [Leitor de arquivos do seed](../../../backend/prisma/seed-bens/arquivo-reader.ts)
- [Configuração de cabeçalhos do seed](../../../backend/prisma/seed-config.ts)

## Histórico deste registro

| Data | Alteração |
|---|---|
| 2026-10-23 | Registro inicial da adoção do SheetJS CE 0.20.3 para leitura local de CSV/XLSX no seed. |
