# buscARPE — Tasks Smart

Transcrição do arquivo **buscARPE - tasks smart.pdf** fornecido para o projeto.

## Sprint 0 (13-14/10) — Setup & Integração

### Card 0.1: [Backend] Setup inicial do NestJS, Prisma e PostgreSQL

**Etiquetas:** Backend, Construir do Zero  
**Data:** 14/10/2026

**Descrição:**  
Esta tarefa tem como objetivo inicializar a infraestrutura do backend do buscARPE criando o projeto NestJS dentro do diretório `/backend`, configurando a conexão local com o banco de dados PostgreSQL e instalando o Prisma ORM. Para comprovar que a base do servidor está funcional e pronta para receber os módulos de negócio, será exposto um endpoint de teste `GET /health` que responde `{ status: "ok" }`. O escopo se restringe estritamente à infraestrutura inicial, sem implementação de tabelas ou regras de negócio nesta etapa.

**Checklist do que tem que ser feito:**

- [x] Criar projeto NestJS na pasta `/backend` com TypeScript
- [x] Instalar e inicializar o Prisma (`@prisma/client` e `prisma`)
- [x] Configurar variáveis de ambiente (`.env`) com a string de conexão do PostgreSQL
- [x] Criar módulo e controller de health check (`GET /health`)
- [x] Rodar o servidor via `npm run start:dev` e validar resposta `200 OK` na porta 3001

### Card 0.2: [Frontend] Setup do Next.js (App Router), Tailwind v4 e Shadcn/ui

**Etiquetas:** Frontend, Construir do Zero  
**Data:** 14/10/2026

**Descrição:**  
Configurar o ambiente base do frontend na pasta `/frontend` utilizando Next.js com App Router e TypeScript. Devemos instalar o TailwindCSS v4 com `@tailwindcss/postcss`, adicionar a biblioteca `lucide-react`, utilitários de estilização (`clsx`, `tailwind-merge`) e instalar os componentes base do shadcn/ui que serão utilizados no projeto (Button, Input, Tabs, Dialog). Além disso, é necessário portar as variáveis de cores e tokens do protótipo Lovable, com destaque para a paleta do SAA (azul `#1D6FB8`) e do SES (verde-azulado `#1A9E8F`).

**Checklist do que tem que ser feito:**

- [x] Inicializar projeto Next.js em `/frontend` com TypeScript e App Router
- [x] Configurar TailwindCSS v4 e PostCSS
- [x] Configurar tokens de cores no CSS global (paleta oficial SAA `#1D6FB8` e SES `#1A9E8F`)
- [x] Instalar pacotes essenciais (`lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`)
- [x] Instalar componentes base do shadcn (`button`, `input`, `tabs`, `dialog`)
- [x] Executar `npm run dev` e validar que a aplicação sobe limpa na porta 3000

### Card 0.3: [Fullstack] Integração Next.js ↔ NestJS via Rewrites

**Etiquetas:** Frontend, Backend, Construir do Zero  
**Data:** 14/10/2026

**Descrição:**  
Configurar a comunicação transparente entre o frontend Next.js (porta 3000) e o backend NestJS (porta 3001). Para evitar problemas de CORS e simplificar o tráfego de cookies de autenticação no mesmo domínio, adicionaremos regras de `rewrites` no `next.config.ts`, fazendo com que qualquer chamada a `/api/*` seja encaminhada internamente para o NestJS. O critério de conclusão é realizar uma chamada `fetch('/api/health')` a partir de uma página no Next.js e exibir o resultado retornado pelo NestJS na tela.

**Checklist do que tem que ser feito:**

- [x] Adicionar configuração de rewrites no `next.config.ts` apontando `/api/:path*` para `http://localhost:3001/:path*`
- [x] Criar uma página de teste temporária no Next.js chamando `/api/health`
- [x] Testar no navegador se a requisição responde sem erros de CORS
- [x] Validar que os dois serviços conseguem rodar simultaneamente em terminais separados

## Sprint 1 (15-19/10) — Backend & Dados

### Card 1.1: [Backend] Modelagem Prisma: Municípios, Bens e Documentos

**Etiquetas:** Backend, Construir do Zero  
**Data:** 15/10/2026

**Descrição:**  
Definir o schema do Prisma no PostgreSQL conforme a arquitetura de 3 camadas especificada na documentação de domínio. Criaremos a tabela `Municipio` (`id`, `nome`, `nome_normalizado`, `geres`, `mrae`), a tabela `Bem` com suporte a auto-relacionamento pai/filho (`id` numérico autoincremento, `codigo`, `nome`, `municipio_id`, `endereco`, `latitude`, `longitude`, `categoria`, `tipo_sistema`, `situacao`, `is_pai`, `bem_pai_id`, `dados_complementares` como JSONB, `busca_texto`, e o campo reservado `apontamentos`), além das tabelas `Documento` e `Usuario`. Essa estrutura garante que qualquer coluna futura da planilha seja acomodada no JSONB sem necessidade de novas migrations.

**Checklist do que tem que ser feito:**

- [x] Escrever o modelo Municipio no `schema.prisma`
- [x] Escrever o modelo Bem com auto-relacionamento (`bem_pai` e `filhos`) e campo `dados_complementares Json`
- [x] Adicionar campo `busca_texto` com índice para acelerar a busca `ILIKE`
- [x] Escrever os modelos Documento e Usuario
- [x] Executar `npx prisma migrate dev --name init_database` e verificar tabelas criadas no banco

### Card 1.2: [Backend] Script de Carga da Tabela de Domínio Geográfico

**Etiquetas:** Backend, Construir do Zero  
**Data:** 16/10/2026

**Descrição:**  
Construir a base de domínio geográfico interna para garantir que os 184 municípios de Pernambuco mais o distrito estadual de Fernando de Noronha (totalizando 185 registros) estejam associados corretamente às suas 12 GERES e às suas 2 MRAEs (MRAE-I Sertão e MRAE-II RMR-Pajeú). O script deve ler um arquivo CSV estruturado e salvar no banco, tratando as armadilhas conhecidas do documento de referência: remoção de anotações no município de São José do Egito e padronização da grafia de Itamaracá. Essa base é essencial para alimentar os filtros em cascata sem regras fixas no código.

**Checklist do que tem que ser feito:**

- [x] Criar o arquivo `municipios.csv` com as colunas: nome, geres, mrae
- [x] Validar ausência de duplicatas e anotações ruidosas no arquivo CSV
- [x] Criar serviço ou script de seed para popular a tabela Municipio
- [x] Implementar conferência automática por script garantindo a inserção exata dos 185 registros
- [x] Adicionar tratamento de normalização (sem acentos e minúsculas) na coluna `nome_normalizado`

### Card 1.3: [Backend] Script de Seed da Planilha Oficial com Derivação dos Bens Pai

**Etiquetas:** Backend, Construir do Zero  
**Data:** 18/10/2026

**Descrição:**  
Desenvolver o script de carga de dados oficial a partir da planilha de equipamentos. Como a planilha contém apenas equipamentos (Bens Filhos), o script deve agrupar as linhas por `CODIGO_UNICO_INSTALACAO` para gerar os Bens Pai. Deve calcular as coordenadas do Bem Pai pela média dos filhos válidos, extrair Categoria e Sistema pelo código (ex.: `EAT` -> `SAA`), aplicar a regra de situação ("Operando" se houver ao menos um filho operando; "Inoperante" se todos forem inoperantes), associar ao município normalizado da tabela de domínio e preencher o texto consolidado em `busca_texto`. Todas as colunas excedentes vão para o JSONB `dados_complementares`. O script precisa rodar em lote e ser idempotente.

**Checklist do que tem que ser feito:**

- [x] Criar módulo de seed e arquivo de mapeamento `seed-config.ts`
- [x] Implementar leitura de arquivo (CSV/XLSX) e conversão de coordenadas (vírgula para ponto)
- [x] Implementar agrupamento de linhas pelo código da instalação e cálculo de média de lat/lng
- [x] Implementar regra de derivação de situação do pai baseada no estado dos filhos
- [x] Fazer o casamento exato de município normalizado com a tabela de domínio
- [x] Popular `busca_texto` em caixa baixa e sem acentos
- [x] Inserir os dados em lotes (batch) com lógica de upsert e emitir log de conferência ao final

### Card 1.4: [Backend] Endpoints de Leitura: Listagem Leve, Detalhe e Filtros

**Etiquetas:** Backend, Construir do Zero  
**Data:** 19/10/2026

**Descrição:**  
Criar as rotas da API que abastecerão o mapa e os painéis de visualização. O endpoint `GET /filtros` fornecerá a lista de opções únicas de Microrregião, GERES, Municípios, Sistemas, Categorias e Situações. O endpoint `GET /bens` retornará uma listagem leve contendo apenas os dados dos Bens Pai necessários para plotagem (`id`, `nome`, `codigo`, `latitude`, `longitude`, `tipo_sistema`, `situacao`), aplicando filtros cumulativos ("E") e busca textual via `ILIKE` na coluna `busca_texto`. Por fim, o endpoint `GET /bens/:id` retornará os dados completos da instalação selecionada, incluindo a lista resumida de equipamentos filhos e links de documentos.

**Checklist do que tem que ser feito:**

- [x] Criar módulo e controller BensModule no NestJS
- [x] Implementar `GET /filtros` retornando listas dinâmicas para a interface
- [x] Implementar `GET /bens` recebendo query params (mrae, geres, municipio, sistema, categoria, situacao, q)
- [x] Adicionar filtro de texto por `ILIKE` na coluna `busca_texto` com normalização de entrada
- [x] Implementar `GET /bens/:id` com dados detalhados do pai e relação com filhos e documentos
- [x] Testar todos os endpoints e validar performance das queries

## Sprint 2 (20-23/10) — Front: Mapa, Filtros & Busca

### Card 2.1: [Frontend] Componente de Mapa com Marcadores SAA/SES e Opacidade

**Etiquetas:** Frontend, Portar do Lovable  
**Data:** 21/10/2026

**Descrição:**  
Portar a visualização central do Leaflet para o Next.js, carregando a biblioteca dinamicamente no cliente (`ssr: false`) para evitar falhas de renderização no servidor. O mapa deve carregar enquadrando inicialmente o estado de Pernambuco e plotar somente os Bens Pai retornados por `GET /bens` em suas coordenadas. A identidade visual deve ser rigorosamente respeitada: marcadores do SAA na cor azul (`#1D6FB8`), marcadores do SES em verde-azulado (`#1A9E8F`), e marcadores com situação "Inoperante" exibidos com opacidade visivelmente reduzida. Bens filhos nunca devem aparecer como pinos soltos no mapa.

**Checklist do que tem que ser feito:**

- [x] Criar componente Map isolado com `use client` e carregamento dinâmico sem SSR
- [x] Definir coordenadas centrais e zoom de abertura com enquadramento de Pernambuco (HU-01 CA-02)
- [x] Consumir os dados leves de `GET /bens` e plotar os marcadores dos Bens Pai (HU-01 CA-01, CA-03)
- [x] Criar ícones estilizados para SAA (azul) e SES (verde-azulado) (HU-01 CA-04)
- [x] Aplicar estilo de opacidade reduzida nos marcadores com situação "Inoperante" (HU-01 CA-05)

### Card 2.2: [Frontend] Clusterização Numérica e Cores de Sistema

**Etiquetas:** Frontend, Portar do Lovable  
**Data:** 21/10/2026

**Descrição:**  
Integrar o plugin `leaflet.markercluster` ao mapa para agrupar bens próximos em zoom distante, mantendo a tela legível. Cada cluster deve exibir um indicador numérico e se desmembrar gradualmente conforme o usuário aproxima a visualização. Na estilização visual dos clusters: se o agrupamento contiver apenas bens de um sistema, deve adotar a cor correspondente (azul para SAA ou verde-azulado para SES); se for um cluster misto (bens de ambos os sistemas), deve utilizar marcador bicolor dividido via CSS (`conic-gradient`) ou adotar cor intermediária como fallback (conforme decisão D-02).

**Checklist do que tem que ser feito:**

- [x] Instalar e configurar `leaflet.markercluster` no componente do mapa
- [x] Customizar `iconCreateFunction` para gerar clusters com o total numérico de bens (HU-02 CA-01, CA-02, CA-03)
- [x] Aplicar estilo azul nos clusters homogêneos de SAA e verde-azulado para SES (HU-02 CA-04)
- [x] Implementar cluster misto (bicolor via `conic-gradient` ou cor mista de fallback D-02) (HU-02 CA-05)
- [x] Validar comportamento suave de clique no cluster abrindo o zoom da região

### Card 2.3: [Frontend] Gaveta Lateral de Filtros em Cascata (Sanfona)

**Etiquetas:** Frontend, Portar do Lovable  
**Data:** 22/10/2026

**Descrição:**  
Construir o painel lateral retrátil (gaveta) contendo os filtros em formato sanfona (acordeom), alimentado pelo endpoint `GET /filtros`. O painel deve disponibilizar os 6 filtros do sistema: Microrregião (MRAE), GERES, Município, Sistema, Categoria e Situação. Implementar a regra de hierarquia em cascata onde a seleção de uma GERES restringe automaticamente os municípios disponíveis na lista correspondente. Cada alteração de filtro deve ser aplicada de forma cumulativa (lógica "E") e atualizar imediatamente os marcadores e clusters visíveis no mapa.

**Checklist do que tem que ser feito:**

- [x] Portar gaveta lateral retrátil acionada pelo botão "Filtros" do cabeçalho
- [x] Criar acordeom com os 6 filtros (MRAE, GERES, Município, Sistema, Categoria, Situação)
- [x] Implementar regra de cascata: GERES selecionada filtra a lista de Municípios (HU-05 CA-01)
- [x] Implementar lógica cumulativa ("E") sincronizada com as requisições de `GET /bens` (HU-05 CA-02)
- [x] Adicionar botão "Redefinir filtros" para resetar todas as opções e restaurar o mapa (HU-05 CA-03)

### Card 2.4: [Frontend] Barra de Busca Livre, Contador e Estado Vazio

**Etiquetas:** Frontend, Portar do Lovable  
**Data:** 23/10/2026

**Descrição:**  
Implementar a barra de busca textual no cabeçalho com atraso de digitação (debounce de 300ms) para consultar múltiplos campos no backend (nome, código, endereço, município, categoria, sistema, situação). A busca deve respeitar quaisquer filtros que já estejam selecionados na gaveta lateral e ignorar acentuações e maiúsculas. O cabeçalho deve exibir o contador de bens encontrados no canto superior direito. Caso a pesquisa não retorne nenhum resultado, o sistema deve limpar todos os marcadores do mapa e exibir um card centralizado com a mensagem `"Nenhum bem encontrado"`. O botão "Limpar" deve resetar o termo de busca.

**Checklist do que tem que ser feito:**

- [x] Portar campo de busca textual no cabeçalho com ícone e controle de estado
- [x] Aplicar debounce de 300ms na digitação para evitar excesso de requisições
- [x] Integrar busca com os filtros ativos e enviar termo normalizado à API (HU-04 CA-01, CA-02, CA-03)
- [x] Atualizar badge do contador com o total de bens retornados no recorte atual (HU-04 CA-04)
- [x] Criar estado vazio com card "Nenhum bem encontrado" e mapa sem marcadores (HU-04 CA-05)
- [x] Adicionar ação ao botão "Limpar" no cabeçalho para restaurar o estado inicial

## Sprint 3 (24-26/10) — Detalhes, Docs & Auth

### Card 3.1: [Frontend] Painel de Detalhes do Bem (Abas: Visão Geral, Equipamentos e Documentos)

**Etiquetas:** Frontend, Portar do Lovable  
**Data:** 24/10/2026

**Descrição:**  
Portar a gaveta flutuante de detalhes que se abre ao clicar em qualquer marcador de Bem Pai no mapa, disparando a busca em `GET /bens/:id`. O painel conterá 3 abas: a aba "Visão Geral", exibindo os 7 campos cadastrais essenciais (Código Único, Nome, Endereço, Município, Categoria, Tipo de Sistema e Situação); a aba "Equipamentos", com lista rolável dos bens filhos mostrando Nome, Código e Situação (ou mensagem informando ausência de equipamentos); e a aba "Documentos", com links externos para pastas do Google Drive abrindo em nova aba (ou mensagem de ausência de documentos anexados).

**Checklist do que tem que ser feito:**

- [x] Integrar evento de clique no marcador do mapa para abrir a gaveta de detalhes e buscar `GET /bens/:id`
- [x] Implementar aba "Visão Geral" com exibição dos 7 campos cadastrais do Bem Pai (HU-06)
- [x] Implementar aba "Equipamentos" com lista rolável dos filhos e estado vazio (HU-07 CA-01, CA-02)
- [x] Implementar aba "Documentos" com links externos (`target="_blank"`) e estado vazio (HU-08 CA-01, CA-02)
- [x] Garantir fechamento fluido da gaveta pelo botão "X" ou clique fora

### Card 3.2: [Backend] Autenticação com JWT em Cookie HttpOnly e Guards

**Etiquetas:** Backend, Construir do Zero  
**Data:** 25/10/2026

**Descrição:**  
Desenvolver o módulo de autenticação seguro no NestJS para controle de acesso do Usuário Comum. Criar a rota `POST /auth/login`, que valida as credenciais contra a tabela `Usuario` usando bcrypt para checagem da senha criptografada. Em caso de sucesso, a rota deve gerar um token JWT e gravá-lo diretamente em um cookie HTTP com a flag `httpOnly`, impedindo acesso indevido via scripts no navegador. Criar a rota `POST /auth/logout` para expirar o cookie e desenvolver um `AuthGuard` global ou modular para proteger os endpoints de leitura de bens contra acessos não autorizados.

**Checklist do que tem que ser feito:**

- [x] Criar AuthModule, AuthService e AuthController no NestJS
- [x] Implementar verificação de hash de senha com bcrypt na rota `POST /auth/login`
- [x] Configurar emissão de JWT gravado em cookie `httpOnly` (`sameSite: lax`)
- [x] Implementar rota `POST /auth/logout` que limpa o cookie da sessão (HU-09 CA-03)
- [x] Criar `JwtAuthGuard` para bloquear requisições não autenticadas retornando `401 Unauthorized`

### Card 3.3: [Frontend] Tela de Login, Tratamento de Erro e Logout

**Etiquetas:** Frontend, Portar do Lovable, Construir do Zero  
**Data:** 25/10/2026

**Descrição:**  
Construir a página de Login (`/login`) contendo o card centralizado com logotipo, título do buscARPE, campos de e-mail e senha e botão de entrar. O formulário deve enviar os dados para `POST /api/auth/login`. Caso as credenciais estejam erradas, deve exibir exatamente a mensagem genérica em vermelho `"E-mail ou senha inválidos"`, sem informar qual campo falhou. Em caso de sucesso, deve redirecionar o usuário para a página principal (`/mapa`). No cabeçalho da aplicação principal, integrar o botão "Sair" para chamar o logout e redirecionar a navegação de volta para a tela de login.

**Checklist do que tem que ser feito:**

- [x] Criar página de login em `/app/login/page.tsx` com o layout centralizado do protótipo
- [x] Implementar formulário com validação simples e envio para `/api/auth/login`
- [x] Exibir mensagem de erro genérica em vermelho "E-mail ou senha inválidos" (HU-09 CA-02)
- [x] Redirecionar com sucesso para `/mapa` ao autenticar (HU-09 CA-01)
- [x] Conectar botão "Sair" do cabeçalho chamando logout e redirecionando para `/login` (HU-09 CA-03)

### Card 3.4: [Frontend] Proteção de Rotas com middleware.ts

**Etiquetas:** Frontend, Construir do Zero  
**Data:** 26/10/2026

**Descrição:**  
Criar um middleware de segurança no Next.js (`middleware.ts`) na raiz do frontend para interceptar as requisições antes da renderização das páginas. Qualquer tentativa de acesso anônimo (sem cookie de autenticação ativo) a rotas internas como `/mapa` deve ser bloqueada e redirecionada imediatamente para a tela de login `/login`. Caso um Usuário Comum tente acessar rotas restritas de administração como `/admin`, deve ser redirecionado para a tela inicial. Além disso, garantir que nenhum botão ou funcionalidade de edição/administração apareça na interface do Usuário Comum.

**Checklist do que tem que ser feito:**

- [x] Criar arquivo `middleware.ts` na raiz do projeto Next.js
- [x] Verificar existência do cookie JWT em rotas protegidas (`/mapa`, `/admin`)
- [x] Redirecionar usuário não autenticado imediatamente para `/login` (HU-10 CA-01)
- [x] Bloquear acesso a `/admin` redirecionando para a rota inicial (HU-10 CA-02)
- [x] Garantir que o sistema só exiba funcionalidades de leitura para o Usuário Comum (HU-10 CA-03)

## Buffer (27-28/10) — Validação & Congelamento

### Card B.1: [QA / Fullstack] Bateria de Validação de todos os Critérios de Aceite

**Etiquetas:** Frontend, Backend, Construir do Zero  
**Data:** 28/10/2026 (12:00)

**Descrição:**  
Executar uma validação ponta a ponta rigorosa contra todos os critérios de aceite documentados no backlog oficial (de HU-01 a HU-10). O teste deve cobrir a visualização do mapa e enquadramento de Pernambuco, desmembramento dos clusters, aplicação das cores e opacidade dos inoperantes, funcionamento dos filtros cumulativos e hierarquia em cascata, busca com e sem acento, abertura dos detalhes do bem e abertura dos documentos em nova aba, além da proteção de rotas anônimas. Qualquer divergência visual ou erro de resposta encontrado deve ser corrigido nesta janela de tempo.

**Checklist do que tem que ser feito:**

- [x] Validar HU-01 (plotagem correta dos pais, enquadramento de PE, cores SAA/SES e opacidade)
- [x] Validar HU-02 (clusters com números, zoom gradual, cores de sistema e fallback bicolor)
- [x] Validar HU-04 (busca textual sem acento, parcial, combinada a filtros e estado vazio)
- [x] Validar HU-05 (cascata GERES -> Município e cumulatividade "E" dos filtros)
- [x] Validar HU-06, HU-07 e HU-08 (abas Visão Geral, Equipamentos e Documentos abrindo em nova aba)
- [x] Validar HU-09 e HU-10 (login, logout, feedback de erro e bloqueio de rotas)

### Card B.2: [Fullstack] Documentação de Execução (README) e Congelamento de Código

**Etiquetas:** Frontend, Backend, Construir do Zero  
**Data:** 28/10/2026 (18:00)

**Descrição:**  
Finalizar e consolidar o projeto para entrega do MVP dentro do prazo final acordado. Devemos elaborar um arquivo `README.md` completo, claro e objetivo na raiz do repositório, contendo os pré-requisitos necessários, o passo a passo de configuração do banco PostgreSQL, execução das migrations do Prisma, comando para rodar o seed oficial, comandos de inicialização simultânea do backend e do frontend, e as credenciais de teste do usuário padrão. Após validar que o projeto roda perfeitamente em um clone limpo, o código da branch de entrega é formalmente congelado.

**Checklist do que tem que ser feito:**

- [ ] Elaborar README.md detalhado com instruções de setup do PostgreSQL
- [ ] Documentar comandos de migration e execução do seed de dados
- [ ] Documentar passos para rodar o frontend e o backend localmente
- [ ] Incluir no README usuário e senha de demonstração para acesso ao sistema
- [ ] Testar a subida completa do sistema a partir de um clone limpo seguindo o README
- [ ] Congelar branches e finalizar a entrega oficial do MVP do buscARPE

## Histórico de Alterações

| Data       | Alteração                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| 2026-10-22 | Transcrição das sprints, cards, descrições, datas e checklists do PDF de tasks smart fornecido para o projeto. |
