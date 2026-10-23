# buscARPE

Sistema web para centralização, consulta e visualização geográfica de informações oficiais sobre os **bens reversíveis dos sistemas de saneamento de Pernambuco** — Abastecimento de Água (SAA) e Esgotamento Sanitário (SES) — regulados pela ARPE.

---

## 🎯 Objetivo e Escopo do MVP

O buscARPE resolve a fragmentação de dados das instalações e equipamentos, permitindo consulta ágil e espacializada a partir do Documento Final Oficial da concessionária.

* **Está no MVP:**
  - Visualização dos Bens Pai (instalações) em mapa interativo com *clustering* (agrupamento numérico) e diferenciação visual por sistema (SAA azul e SES verde-azulado);
  - Gaveta lateral de filtros cumulativos em cascata (Microrregião/MRAE, GERES, Município, Sistema, Categoria e Situação);
  - Barra de busca textual livre, multi-campo e tolerante a termos sem acento e parciais;
  - Painel de detalhes do Bem Pai com abas: *Visão Geral* (dados cadastrais), *Equipamentos* (bens filhos) e *Documentos* (links externos);
  - Autenticação e proteção de rotas via JWT e cookies protegidos.
* **Fora do MVP:** Edição, inserção manual ou telas administrativas de cadastro (foco total em consulta para o Usuário Comum).

---

## 🏗️ Arquitetura e Tecnologias

A aplicação é estruturada como um monorepo simples e modular:

* **Frontend (`/frontend`):** [Next.js](https://nextjs.org) (App Router), TypeScript, [TailwindCSS v4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com) e [Leaflet](https://leafletjs.com).
* **Backend (`/backend`):** [NestJS](https://nestjs.com), TypeScript, [Prisma ORM](https://www.prisma.io), [PostgreSQL](https://www.postgresql.org) e [SheetJS CE](https://docs.sheetjs.com/) para leitura de arquivos CSV/XLSX no seed.
* **Integração:** Comunicação transparente entre frontend (porta 3000) e backend (porta 3001) via `rewrites` nativos do Next.js (`/api/*`), eliminando problemas de CORS e garantindo cookies seguros no mesmo domínio.

---

## 📋 Pré-requisitos

* [Node.js](https://nodejs.org) (v20 ou superior — testado na v24)
* [npm](https://www.npmjs.com) (v10 ou superior)
* [PostgreSQL](https://www.postgresql.org) (v15 ou superior rodando localmente na porta padrão `5432`)

---

## 🚀 Como Executar o Projeto Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/MarcTony0/busc-arpe.git
cd busc-arpe
```

### 2. Configurar o Banco de Dados (Backend)
No diretório `backend/`, duplique o arquivo `.env.example` para `.env` e configure suas credenciais locais do PostgreSQL:
```bash
cp backend/.env.example backend/.env
```
Formato esperado no `.env`:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco?schema=public"
```

### 3. Executar o Backend (NestJS)
Abra um terminal e execute:
```bash
cd backend
npm install
npm run start:dev
```
O servidor NestJS iniciará na porta **3001**.
* *Health check de validação:* [http://localhost:3001/health](http://localhost:3001/health) (deve responder `{"status":"ok"}`).

### Carga de bens a partir de CSV/XLSX
O comando abaixo conecta ao PostgreSQL configurado em `backend/.env` e grava os bens. Use somente depois de confirmar o banco-alvo, aplicar as migrations necessárias e selecionar o arquivo correto:
```bash
cd backend
npm run seed:bens -- "C:\caminho\para\bens.xlsx"
```
Também aceita arquivo `.csv`. O seed atualiza ou cria registros usando `codigo_unico` e transações por lotes; ele não exclui do banco bens que não estejam presentes no arquivo. Veja a [ADR-0001](./docs/03-arquitetura/adr/ADR-0001-leitura-de-planilhas-com-sheetjs.md) para a decisão de leitura de planilhas.
Instalações sem correspondência exata na tabela de municípios ou com municípios divergentes entre os filhos são adiadas e listadas em um relatório CSV salvo junto ao arquivo de entrada; os demais grupos válidos podem ser carregados.

### 4. Executar o Frontend (Next.js)
Abra um **segundo terminal** e execute:
```bash
cd frontend
npm install
npm run dev
```
O servidor Next.js iniciará na porta **3000**.
* *Acesso à aplicação:* [http://localhost:3000](http://localhost:3000)

---

## 📚 Documentação Técnica Adicional

Para detalhes completos de regras de negócio, modelagem de dados e requisitos funcionais, consulte a pasta [`docs/`](./docs):
* **[Análise de Domínio e Modelo Conceitual](./docs/01-dominio/analise-de-dominio.md)**
* **[Backlog do Produto, Épicos e Histórias de Usuário (HUs)](./docs/02-requisitos/backlog.md)**
* **[Decisões de Arquitetura (ADRs)](./docs/03-arquitetura/adr/ADR-0001-leitura-de-planilhas-com-sheetjs.md)**
* **[Transcrição das Sprints e Tasks Smart](./docs/04-backlog/tasks-smart-transcricao.md)**
* **[Handover do Card 1.3 — Seed de Bens](./docs/04-backlog/handover-card-1.3.md)**

## Histórico de Alterações

| Data | Alteração |
|---|---|
| 2026-10-22 | Adicionada referência à transcrição das sprints e tasks do projeto. |
| 2026-10-23 | Documentada a adoção do SheetJS CE 0.20.3 para leitura de CSV/XLSX e adicionada referência à ADR-0001. |
| 2026-10-23 | Documentado o comando de seed de bens, seu efeito de escrita e a política de upsert sem exclusão de registros ausentes no arquivo. |
| 2026-10-23 | Documentado o adiamento de instalações sem associação municipal válida e o relatório local de pendências. |
| 2026-10-23 | Adicionado handover do Card 1.3 com estado, validações, regras e bloqueios para continuidade em outro ambiente. |