# buscARPE

Plataforma de centralização, consulta e visualização geográfica dos **Bens Reversíveis dos Sistemas de Saneamento de Pernambuco** (SAA e SES) regulados pela **ARPE** (Agência de Regulação de Pernambuco).

---

## 🏗️ Estrutura do Monorepo

* **`frontend/`**: Interface Web construída com **Next.js 16** (App Router), TypeScript, **TailwindCSS v4** e **Leaflet** (mapas e clusterização).
* **`backend/`**: API RESTful desenvolvida com **NestJS 12**, **Prisma ORM 7** e **PostgreSQL 16+**. Autenticação via JWT em cookies `httpOnly`.
* **`docs/`**: Documentação técnica de requisitos, domínio, decisões arquiteturais (ADRs) e backlog.

---

## ⚡ Início Rápido (Ambiente Local)

### Pré-requisitos
* **Node.js** (v20 ou superior — testado na v24)
* **npm** (v10 ou superior)
* **PostgreSQL** rodando localmente (porta padrão `5432`)

---

### 1. Backend (NestJS)

1. Entre na pasta e instale as dependências:
   ```powershell
   cd backend
   npm.cmd install
   ```

2. Configure o arquivo `.env` (baseado em `.env.example`):
   ```env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/buscarpe?schema=public"
   JWT_SECRET="sua-chave-secreta-jwt-local"
   PORT=3001
   ```

3. Aplique as migrações do banco de dados:
   ```powershell
   npx.cmd prisma migrate deploy
   ```

4. **Credenciais Locais de Acesso:**
   Para manter o repositório livre de credenciais reais, copie o modelo `usuarios.example.json` para criar seu arquivo privado `usuarios.local.json` (já protegido no `.gitignore`):
   ```powershell
   cp prisma/usuarios.example.json prisma/usuarios.local.json
   ```
   *(Edite com seu nome, e-mail e senha de desenvolvimento).*

5. Execute a carga completa unificada de dados (185 municípios, 20.686 bens e usuários locais):
   ```powershell
   npm.cmd run seed:all
   ```

6. Inicie a API:
   ```powershell
   npm.cmd run start:dev
   ```
   *Servidor rodando em: `http://localhost:3001`*

---

### 2. Frontend (Next.js)

1. Em outro terminal, acesse a pasta e instale as dependências:
   ```powershell
   cd frontend
   npm.cmd install
   ```

2. Inicie o servidor Next.js:
   ```powershell
   npm.cmd run dev
   ```
   *Aplicação acessível em: `http://localhost:3000`*

3. Entre com as credenciais que você configurou no `usuarios.local.json`.

---

## 🧪 Testes e Build

```powershell
# Executar suíte de testes unitários do backend (15 suítes / 76 testes)
cd backend
npm.cmd test

# Validar compilação de produção
cd backend  && npm.cmd run build
cd frontend && npm.cmd run build
```

---

## 📚 Documentação Técnica

Para detalhes aprofundados sobre o projeto, consulte a pasta [`docs/`](./docs):
* **[Análise de Domínio e Modelo](./docs/01-dominio/analise-de-dominio.md)**: Regras geográficas, hierarquia Bem Pai / Filho e concessões.
* **[Backlog e Requisitos](./docs/02-requisitos/backlog.md)**: Histórias de usuário (HU-01 a HU-10) e critérios de aceite.
* **[Decisões de Arquitetura (ADRs)](./docs/03-arquitetura/adr/ADR-0001-leitura-de-planilhas-com-sheetjs.md)**: Ingestão de planilhas com SheetJS.
* **[Guia de Deploy em Nuvem](./docs/03-arquitetura/guia-deploy-nuvem.md)**: Roteiro para publicação online (Supabase, Render e Vercel).
* **[Padrão de Versionamento e Branches](./docs/03-arquitetura/padrao-de-versionamento.md)**: Git Flow moderno, nomenclatura de branches e SemVer.
* **[Tasks e Sprints](./docs/04-backlog/tasks.md)**: Acompanhamento e entrega das tarefas do MVP.
