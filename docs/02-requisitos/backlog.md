# buscARPE — Requisitos, Épicos e Histórias de Usuário

## Histórico de Versões

| Versão | Data | Descrição |
|---|---|---|
| 0.1.0 | 2026-09-25 | Definição inicial dos atores e mapa de épicos (MVP e pós-MVP) |
| 0.2.0 | 2026-09-25 | Refinamento do EP-01: HU-01 e HU-02 com critérios de aceite |
| 0.3.0 | 2026-09-25 | Decisões D-01 e D-02 resolvidas; CA-05 adicionado à HU-01; CA-05 da HU-02 atualizado com fallback confirmado |
| 0.4.0 | 2026-10-05 | Refinamento do EP-02: HU-04 (Pesquisa Livre) e HU-05 (Filtros Avançados) |
| 0.5.0 | 2026-10-05 | Refinamento do EP-03: HU-06, HU-07 e HU-08 (Detalhes, Equipamentos e Documentos) |
| 0.6.0 | 2026-10-05 | Inclusão do EP-04: Autenticação (HU-09 e HU-10) e atualização do mapa de épicos |
| 0.7.0 | 2026-10-22 | Definição do escopo da busca textual: índices independentes para pais e filhos; busca do mapa restrita aos atributos dos Bens Pais |
| 0.8.0 | 2026-10-22 | Definição de que dados complementares da instalação ficam no Bem Pai e dados complementares de equipamentos ficam nos respectivos Bens Filhos |
| 0.9.0 | 2026-10-22 | Registro da preparação em memória dos payloads de pais e filhos, da separação de campos núcleo/JSONB e das validações de consistência da instalação |
| 0.10.0 | 2026-10-23 | Registro da decisão arquitetural de utilizar SheetJS CE 0.20.3 na leitura local de CSV/XLSX do seed; ver [ADR-0001](../03-arquitetura/adr/ADR-0001-leitura-de-planilhas-com-sheetjs.md) |

---

## Atores

| Ator | Descrição | Relevância |
|---|---|---|
| **Usuário Comum** | Acesso somente de visualização, pesquisa e filtragem dos bens e suas informações | ⭐ Foco do MVP |
| **Especialista Técnico** | Tudo do Usuário Comum + adição, edição e exclusão de bens e documentos | Pós-MVP |
| **Gestor** | Visão gerencial, gestão de usuários, permissões e histórico de alterações | 🔵 Decisão pendente |

---

## Mapa de Épicos

### MVP

| ID | Épico | Ator principal | Estado |
|---|---|---|---|
| EP-01 | Visualização Geográfica dos Bens | Usuário Comum | 🟡 Em refinamento |
| EP-02 | Pesquisa e Filtragem de Bens | Usuário Comum | 🟡 Em refinamento |
| EP-03 | Consulta de Detalhes do Bem | Usuário Comum | 🟡 Em refinamento |
| EP-04 | Autenticação e Acesso | Todos | 🟡 Em refinamento |

### Pós-MVP — identificados, não refinados

| ID | Épico | Ator principal | Estado |
|---|---|---|---|
| EP-05 | Gestão de Documentos | Especialista Técnico | ⚪ Descoberta |
| EP-06 | Gestão de Bens | Especialista Técnico | ⚪ Descoberta |
| EP-07 | Gestão da Aplicação | Gestor | 🔵 Decisão pendente |

---

## EP-01 — Visualização Geográfica dos Bens

**Necessidade:** o usuário precisa de uma visão espacial dos bens reversíveis para entender a distribuição geográfica do patrimônio de saneamento de Pernambuco.

**Valor:** localização rápida e contextualizada dos bens sem depender de planilhas ou documentos fragmentados.

**Ator principal:** Usuário Comum

**Estado:** 🟡 Em discussão

### Decisões pendentes do EP-01

| # | Decisão | Estado |
|---|---|---|
| D-01 | Diferenciação visual de marcadores: bens **Inoperantes** exibidos com opacidade reduzida | 🟢 Confirmado |
| D-02 | Cor de fallback para clusters mistos (SAA + SES): cor intermediária entre azul e verde-azulado | 🟢 Confirmado |

---

### HU-01 — Visualizar os bens no mapa

**Como** Usuário Comum,
**quero** ver todos os bens reversíveis distribuídos no mapa ao acessar o sistema,
**para** ter uma visão espacial imediata de todo o patrimônio de saneamento de Pernambuco.

**Estado:** 🟡 Em refinamento

#### Critérios de Aceite

**CA-01 — Bens plotados ao carregar o mapa**
> Dado que existem bens cadastrados no sistema,
> quando o usuário acessa o buscARPE,
> então todos os bens pai devem estar representados no mapa, posicionados nas suas coordenadas geográficas.

**CA-02 — Enquadramento inicial de Pernambuco**
> Dado que o usuário acessa o sistema,
> quando o mapa é exibido pela primeira vez,
> então a visualização inicial deve enquadrar o estado de Pernambuco de modo que o conjunto de bens seja perceptível.

**CA-03 — Bens filhos não aparecem como marcadores independentes**
> Dado que bens filhos (equipamentos) não possuem coordenadas próprias,
> quando o mapa é exibido,
> então nenhum bem filho deve ser plotado como marcador independente no mapa.

**CA-04 — Diferenciação visual por tipo de sistema**
> Dado que o mapa exibe bens de sistemas diferentes,
> quando os marcadores individuais são exibidos,
> então bens do SAA devem aparecer em **azul** e bens do SES em **verde-azulado**, permitindo identificação visual imediata do tipo de sistema.

**CA-05 — Opacidade reduzida para bens Inoperantes**
> Dado que um bem pai possui situação **Inoperante**,
> quando o marcador é exibido no mapa,
> então deve aparecer com opacidade visivelmente reduzida em relação aos bens Operando, indicando seu estado sem removê-lo da visualização.

#### Observações
- A definição do valor exato de opacidade é decisão de implementação/design visual.

---

### HU-02 — Navegar pelo mapa com clustering

**Como** Usuário Comum,
**quero** que bens próximos sejam agrupados automaticamente conforme o nível de zoom,
**para** que o mapa permaneça legível independente de quantos bens existam na região visualizada.

**Estado:** 🟡 Em refinamento

#### Critérios de Aceite

**CA-01 — Bens agrupados em zoom distante**
> Dado que há múltiplos bens próximos no mapa,
> quando o zoom está afastado,
> então esses bens devem aparecer agrupados com um indicador numérico da quantidade.

**CA-02 — Desmembramento ao aproximar o zoom**
> Dado que um cluster está visível,
> quando o usuário aumenta o zoom sobre ele,
> então o cluster deve se desmembrar gradualmente, revelando os bens individuais.

**CA-03 — Marcadores individuais em zoom próximo**
> Dado que os bens estão suficientemente distantes entre si,
> quando o zoom está próximo,
> então cada bem deve ser exibido como marcador individual.

**CA-04 — Cor de cluster homogêneo**
> Dado que um cluster agrupa bens de um único tipo de sistema,
> quando o cluster é exibido,
> então deve ter a cor correspondente ao sistema: **azul** para SAA e **verde-azulado** para SES.

**CA-05 — Cor de cluster misto (SAA + SES)**
> Dado que um cluster agrupa bens de SAA e SES,
> quando o cluster é exibido,
> então o marcador do cluster deve apresentar as duas cores (metade azul / metade verde-azulado), refletindo a composição mista.
>
> ⚠️ **Implicação técnica:** marcadores bipartidos dependem do suporte da biblioteca de mapas utilizada. Caso tecnicamente inviável, aplicar **cor intermediária entre azul e verde-azulado** como fallback (D-02 🟢 Confirmado).

#### Observações
- Clusters mistos com cor dividida são a preferência declarada. A viabilidade será confirmada na escolha da biblioteca de mapas.

---

## EP-02 — Pesquisa e Filtragem de Bens

**Necessidade:** o universo de bens é grande e o usuário precisa chegar rapidamente a um subconjunto específico.

**Valor:** reduzir o tempo de localização de bens de uma região, sistema ou situação específica.

**Ator principal:** Usuário Comum

**Estado:** 🟡 Em refinamento

### HU-03 — Pesquisa livre e abrangente de bens

**Como** Usuário Comum,
**quero** pesquisar Bens Pais por texto livre em suas características,
**para** localizar registros rapidamente mesmo com informações incompletas.

**Estado:** 🟡 Em refinamento

#### Critérios de Aceite

**CA-01 — Busca Multi-campos**
> **Dado** que o usuário autorizado deseja buscar um bem,
> **Quando** ele digitar um termo no campo de pesquisa,
> **Então** o sistema deve retornar os bens que contenham esse termo no nome, código, endereço, categoria, sistema, situação ou município.

**CA-02 — Tolerância e Flexibilidade**
> **Dado** que o sistema possui um bem chamado "Estação São João",
> **Quando** o usuário pesquisar por termos sem acento, em minúsculas ou parciais (ex: "estacao sao joa"),
> **Então** o sistema deve retornar o bem correspondente ignorando a formatação exata.

**CA-03 — Respeito aos filtros**
> **Dado** que existem filtros geográficos ou operacionais aplicados no painel,
> **Quando** o usuário realizar uma pesquisa textual,
> **Então** o sistema deve buscar o termo apenas dentro do universo de bens que já atendem aos filtros ativos.

**CA-04 — Refletir no mapa**
> **Dado** que o mapa exibe um conjunto de bens,
> **Quando** o usuário digitar um termo na pesquisa,
> **Então** o mapa deve ser atualizado, ocultando imediatamente os bens (e clusters) que não correspondem à pesquisa.

**CA-05 — Nenhum resultado encontrado (Caminho de Exceção)**
> **Dado** que o usuário realiza uma busca,
> **Quando** o termo digitado não corresponder a nenhum bem no sistema (ou dentro dos filtros atuais),
> **Então** o sistema deve exibir uma mensagem clara de "Nenhum bem encontrado" e o mapa deve ficar vazio de marcadores.

**CA-06 — Busca restrita aos atributos do Bem Pai**
> **Dado** que um termo aparece somente nos dados de um equipamento (Bem Filho),
> **Quando** o usuário realizar uma busca textual no mapa,
> **Então** a instalação correspondente não deve ser retornada por esse termo; o índice textual próprio do filho não participa da busca de Bens Pais.

#### Observações
- A busca do mapa considera código, nome, endereço, município, categoria, sistema e situação do Bem Pai. Cada Bem Filho pode manter índice de busca próprio, sem que seus dados sejam agregados ao texto de busca do pai.

---

### HU-04 — Painel de Filtros Avançados (Geográficos e Operacionais)

**Como** Usuário Comum,
**quero** filtrar os bens por critérios geográficos (Microrregião, GERES, Município) e operacionais (Sistema, Categoria, Situação),
**para** visualizar subconjuntos específicos e analisar cenários do patrimônio.

**Estado:** 🟡 Em refinamento

#### Critérios de Aceite

**CA-01 — Efeito em cascata (Hierarquia Geográfica)**
> **Dado** que o usuário autorizado acessa o painel de filtros,
> **Quando** ele selecionar uma GERES específica,
> **Então** a lista de Municípios disponíveis para filtro deve exibir apenas os municípios pertencentes àquela GERES.

**CA-02 — Cumulatividade (Lógica "E")**
> **Dado** que o usuário selecionou um filtro (ex: SAA),
> **Quando** ele selecionar um filtro adicional (ex: Inoperante, Recife),
> **Então** o sistema deve aplicar todos os filtros de forma cumulativa, retornando apenas os bens que satisfaçam simultaneamente todas as condições.

**CA-03 — Refletir no mapa**
> **Dado** que o usuário está visualizando bens no mapa,
> **Quando** ele aplicar, alterar ou remover qualquer filtro no painel,
> **Então** o mapa deve ocultar ou exibir os marcadores e clusters correspondentes ao novo recorte selecionado.

---

## EP-03 — Consulta de Detalhes do Bem

**Necessidade:** ao localizar um bem, o usuário precisa acessar suas informações completas — dados cadastrais, equipamentos vinculados e documentos.

**Valor:** centralizar em um só lugar informações hoje dispersas sobre o patrimônio.

**Ator principal:** Usuário Comum

**Estado:** 🟡 Em refinamento

> **Escopo do MVP:** documentos são somente para visualização (leitura). Upload e gestão de documentos pertencem ao EP-05 (pós-MVP).

### HU-05 — Visualizar dados gerais do Bem Pai

**Como** Usuário Comum,
**quero** visualizar os dados essenciais de um Bem Pai selecionado no mapa,
**para** compreender suas características principais sem precisar consultar planilhas externas.

**Estado:** 🟡 Em refinamento

#### Critérios de Aceite
> **Dado** que o usuário clica em um marcador de Bem Pai no mapa,
> **Quando** a visualização de detalhes (gaveta/modal) for aberta,
> **Então** a aba "Visão Geral" deve exibir as informações de Código Único, Nome, Endereço, Município, Categoria, Tipo de Sistema e Situação.

---

### HU-06 — Visualizar lista de equipamentos (Bens Filhos)

**Como** Usuário Comum,
**quero** visualizar a lista de equipamentos (bens filhos) vinculados a uma instalação (Bem Pai),
**para** conhecer a composição técnica daquele local.

**Estado:** 🟡 Em refinamento

#### Critérios de Aceite

**CA-01 — Exibição da lista**
> **Dado** que um Bem Pai possui equipamentos cadastrados,
> **Quando** o usuário acessar a aba "Equipamentos",
> **Então** o sistema deve exibir uma lista rolável contendo o Nome, Código e Situação de cada equipamento filho.

**CA-02 — Instalação sem equipamentos**
> **Dado** que um Bem Pai não possui nenhum equipamento vinculado,
> **Quando** o usuário acessar a aba "Equipamentos",
> **Então** o sistema deve exibir uma mensagem clara informando que "Não há equipamentos cadastrados para este bem".

---

### HU-07 — Visualizar documentos anexos

**Como** Usuário Comum,
**quero** visualizar uma lista com os nomes e links dos documentos anexados ao bem,
**para** consultar laudos, fotos ou plantas relacionadas à instalação.

**Estado:** 🟡 Em refinamento

#### Critérios de Aceite

**CA-01 — Abertura de documentos**
> **Dado** que a aba de Documentos está aberta e possui arquivos listados,
> **Quando** o usuário clicar no link de um documento,
> **Então** o PDF (ou arquivo) correspondente deve ser aberto em uma nova aba do navegador.

**CA-02 — Instalação sem documentos**
> **Dado** que o Bem Pai não possui documentos em anexo,
> **Quando** o usuário acessar a aba "Documentos",
> **Então** o sistema deve exibir uma mensagem clara informando que "Não há documentos anexados a este bem".

---

## EP-04 — Autenticação e Acesso

**Necessidade:** o sistema possui dados restritos e usuários com escopos de permissão diferentes.
**Valor:** garantir que apenas pessoas autorizadas acessem a ferramenta e visualizem/operem funcionalidades condizentes com seu perfil.
**Ator principal:** Todos os usuários
**Estado:** 🟡 Em refinamento

### HU-08 — Login e Autenticação

**Como** usuário cadastrado,
**quero** me autenticar no sistema usando e-mail e senha,
**para** acessar as funcionalidades seguras do buscARPE.

#### Critérios de Aceite

**CA-01 — Login com Sucesso**
> **Dado** que o usuário insere suas credenciais válidas de Usuário Comum,
> **Quando** clicar no botão de entrar,
> **Então** o sistema deve conceder o acesso e carregar a aplicação com as permissões devidas.

**CA-02 — Credenciais Incorretas**
> **Dado** que o usuário está na tela de login,
> **Quando** inserir credenciais incorretas ou inexistentes,
> **Então** o sistema deve bloquear o acesso e exibir uma mensagem genérica (ex: "E-mail ou senha inválidos"), sem especificar qual dos dois falhou.

**CA-03 — Encerrar Sessão (Logout)**
> **Dado** que o usuário está autenticado no sistema,
> **Quando** ele clicar na opção de "Sair" (Logout),
> **Então** o sistema deve encerrar sua sessão e redirecioná-lo para a tela de login.

---

### HU-09 — Proteção de Rotas e Interface

**Como** sistema,
**quero** controlar o acesso às telas e ações com base no perfil logado,
**para** garantir que dados não sejam expostos indevidamente.

#### Critérios de Aceite

**CA-01 — Bloqueio de Usuário Anônimo (Não Logado)**
> **Dado** que uma pessoa não possui uma sessão ativa,
> **Quando** tentar acessar diretamente qualquer URL interna do sistema (ex: `/mapa`),
> **Então** o sistema deve bloquear o acesso e redirecioná-la imediatamente para a tela de login.

**CA-02 — Bloqueio de Rotas (Permissões)**
> **Dado** que o usuário está logado com perfil de Usuário Comum,
> **Quando** tentar acessar via URL direta uma tela exclusiva de Especialista ou Gestor (ex: `/admin`),
> **Então** o sistema deve bloquear o acesso e redirecioná-lo de volta à página inicial.

**CA-03 — Ocultação de Interface**
> **Dado** que o usuário está logado com perfil de Usuário Comum,
> **Quando** ele navegar pelo sistema,
> **Então** funcionalidades de edição, exclusão ou administração não devem sequer aparecer na interface (botões e menus ocultos).

---

## EP-05 — Gestão de Documentos
**Ator principal:** Especialista Técnico
**Estado:** ⚪ Descoberta
> _A ser refinado em iteração futura._

---

## EP-06 — Gestão de Bens
**Ator principal:** Especialista Técnico
**Estado:** ⚪ Descoberta
> _A ser refinado em iteração futura._

---

## EP-07 — Gestão da Aplicação
**Ator principal:** Gestor
**Estado:** 🔵 Decisão pendente
> _Existência e escopo ainda não definidos._
