# Handover — Card 1.3: Seed de Bens

**Atualizado em:** 2026-10-23

**Estado:** implementação local em andamento; carga da planilha ainda não executada.

## Implementado

- Leitura de CSV/XLSX, agrupamento por instalação, cálculo de coordenadas, derivação de situação, associação de município e montagem de payloads pai/filhos.
- Situações do Bem incluem `Operando`, `Inoperante` e `N/I`. Condições originais `N/I` e `Outro` tornam a situação do filho `N/I` e permanecem em `dados_complementares`.
- Regra do Bem Pai: `Operando` se algum filho opera; `N/I` se todos os filhos forem `N/I`; caso contrário, `Inoperante`.
- Persistência por upsert em lotes e transações, com o pai gravado antes dos filhos.
- Associação municipal parcial: instalações sem correspondência no domínio ou com municípios divergentes são separadas dos payloads válidos e geram relatório CSV local com código, número da linha, município informado e motivo. O relatório é salvo junto à entrada com nome único por execução.
- A migration `20261023121311_add_nao_informado_to_situacao_bem` adiciona `N/I` ao enum PostgreSQL `SituacaoBem`.

## Validação realizada

- 45 testes do módulo de seed passaram.
- Build do backend, Oxlint e validação do schema Prisma passaram.
- A migration de `SituacaoBem` foi aplicada no PostgreSQL local e `prisma migrate status` confirmou o schema atualizado.
- A carga de bens **não foi executada**. As tentativas anteriores pararam antes da persistência; a pré-validação mais recente foi somente leitura.

## Pendências que bloqueiam a carga completa

1. A pré-validação identificou 258 linhas cujo município não corresponde exatamente ao domínio: 151 com `MUNICIPIO=N/I` e 107 distribuídas entre 18 outros rótulos não encontrados.
2. Foram identificadas 22 instalações cujos equipamentos apontam para mais de um município. A decisão registrada é mantê-las para análise futura, sem mapeá-las agora; a estratégia aprovada é adiá-las e listá-las no relatório local.
3. A pré-validação parcial parou numa colisão de chave única: na instalação `ABR-EAT-E-001`, a linha 12545 usa `ID_BEM=ABR-EAT-E-001`, igual ao código do Bem Pai. Não foi definida regra para essa colisão. Recomendação pendente: adiar o grupo inteiro e registrá-lo no relatório, sem descartar ou alterar o equipamento.
4. Como a pré-validação parou na colisão, ainda não há contagem final dos grupos válidos nem confirmação end-to-end do relatório para o arquivo completo. Faça nova pré-validação depois de decidir o tratamento da colisão; não execute a carga antes disso.

## Ambiente e segurança dos dados

- A planilha de referência não está versionada. O `.gitignore` ignora `*.csv`, `*.xlsx`, `.env` e arquivos locais de relatório; `backend/prisma/data/municipios.csv` é intencionalmente versionado.
- O `backend/.env` é local e ignorado. Na nova máquina, configurar `DATABASE_URL` a partir de `backend/.env.example`.
- Em um banco novo, instalar dependências, gerar o Prisma Client, aplicar as migrations e carregar a tabela de municípios antes de testar a preparação.
- `npm run seed:bens -- <arquivo>` conecta ao PostgreSQL e grava os grupos válidos; uma falha em lote pode deixar lotes anteriores já confirmados. Só executar após validar os bloqueios restantes e confirmar o banco-alvo.
