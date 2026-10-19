-- CreateEnum
CREATE TYPE "TipoSistema" AS ENUM ('SAA', 'SES');

-- CreateEnum
CREATE TYPE "SituacaoBem" AS ENUM ('OPERANDO', 'INOPERANTE');

-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('USUARIO_COMUM', 'ESPECIALISTA_TECNICO', 'GESTOR');

-- CreateTable
CREATE TABLE "municipios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "geres" TEXT NOT NULL,
    "microrregiao" TEXT NOT NULL,

    CONSTRAINT "municipios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bens" (
    "id" SERIAL NOT NULL,
    "codigo_unico" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "municipio_id" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "categoria" TEXT NOT NULL,
    "tipo_sistema" "TipoSistema" NOT NULL,
    "situacao" "SituacaoBem" NOT NULL,
    "is_pai" BOOLEAN NOT NULL DEFAULT true,
    "bem_pai_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT,
    "bem_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL DEFAULT 'USUARIO_COMUM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "municipios_nome_key" ON "municipios"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "bens_codigo_unico_key" ON "bens"("codigo_unico");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "bens" ADD CONSTRAINT "bens_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bens" ADD CONSTRAINT "bens_bem_pai_id_fkey" FOREIGN KEY ("bem_pai_id") REFERENCES "bens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_bem_id_fkey" FOREIGN KEY ("bem_id") REFERENCES "bens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
