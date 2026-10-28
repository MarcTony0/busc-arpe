# Guia de Deploy em Nuvem — buscARPE

Este documento serve como referência técnica interna para a equipe e mantenedores do **buscARPE** quando for decidido publicar o sistema online de forma contínua em ambiente de nuvem.

---

## 🏛️ Visão da Arquitetura em Nuvem

Para hospedar o buscARPE de forma desacoplada, performática e de baixo custo/gratuita, a arquitetura recomendada é:

```mermaid
flowchart LR
    Navegador["Navegador Web / Mobile"] --> Vercel["Frontend: Next.js (Vercel)"]
    Vercel --> Render["Backend: NestJS (Render / Railway)"]
    Render --> Supabase["Banco de Dados: PostgreSQL (Supabase)"]
```

* **Banco de Dados:** **Supabase** (PostgreSQL gerenciado na nuvem).
* **Backend:** **Render** (Web Service Node.js para o NestJS) ou **Railway**.
* **Frontend:** **Vercel** (Hospedagem nativa do Next.js 16 App Router).

---

## 1. Banco de Dados: Provisionando PostgreSQL no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
2. Defina uma senha forte para o banco de dados e anote-a.
3. No painel do projeto, vá em **Connect ➔ ORMs / Connection string** (ou **Project Settings ➔ Database**).
4. Selecione o modo **Session Pooler (porta 5432)** ou **Direct Connection**:
   - *Aviso sobre IPv4/IPv6:* A conexão direta do Supabase (`db.[PROJETO].supabase.co`) utiliza IPv6 por padrão. Caso seu provedor de internet local opere apenas em IPv4, utilize o **Session Pooler IPv4** (`aws-1-sa-east-1.pooler.supabase.com:5432` com usuário `postgres.[SEU_PROJETO]`), garantindo conectividade estável para migrações e seed.
   ```text
   postgresql://postgres.[SEU_PROJETO]:[SUA_SENHA]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
   ```

---

## 2. Backend: Hospedando o NestJS no Render

1. Acesse [render.com](https://render.com) e selecione **New ➔ Web Service**.
2. Conecte sua conta do GitHub e selecione o repositório privado `MarcTony0/busc-arpe`.
3. Defina as configurações do serviço:
   - **Name:** `buscarpe-api`
   - **Region:** Ohio (ou a mais próxima do seu banco Supabase)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** 
     ```bash
     npm install && npx prisma migrate deploy && npm run build
     ```
   - **Start Command:** 
     ```bash
     npm run start:prod
     ```
4. Na aba **Environment Variables**, adicione:
   - `DATABASE_URL`: *(string de conexão do Supabase obtida no Passo 1)*
   - `JWT_SECRET`: *(uma chave segura gerada para assinatura dos tokens)*
   - `NODE_ENV`: `production`
5. Clique em **Deploy Web Service**. O Render gerará a URL da API (ex: `https://buscarpe-api.onrender.com`).

---

## 3. Carga Inicial de Dados no Banco de Produção (Seed)

Com o banco do Supabase provisionado, execute o pipeline de seed oficial a partir do seu terminal local apontando temporariamente para o banco remoto:

```powershell
cd backend
npm.cmd run seed:all
```

Esse comando executa a ingestão em lote de alta performance (conforme documentado na [ADR-0002](adr/ADR-0002-estrategia-de-carga-em-massa-para-bancos-em-nuvem.md)), garantindo que todos os 185 municípios, os 20.657 bens (3.472 instalações pai e 17.185 equipamentos filhos) e o seu usuário do `usuarios.local.json` sejam inseridos no PostgreSQL do Supabase em menos de 2 minutos.

---

## 4. Frontend: Publicando na Vercel

1. Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**.
2. Selecione o repositório `MarcTony0/busc-arpe`.
3. Configure as propriedades do projeto:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** clique em Edit e selecione a pasta `frontend`
4. Na seção **Environment Variables**, cadastre as variáveis necessárias ou configure o proxy reverso em `frontend/next.config.ts`:
   ```typescript
   async rewrites() {
     return [
       {
         source: "/api/:path*",
         destination: `${process.env.BACKEND_API_URL || 'https://buscarpe-api.onrender.com'}/:path*`,
       },
     ];
   }
   ```
5. Clique em **Deploy**. A Vercel gerará o domínio de produção com HTTPS automático (ex: `https://buscarpe.vercel.app`).

