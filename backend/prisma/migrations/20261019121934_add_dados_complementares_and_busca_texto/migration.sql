/*
  Warnings:

  - You are about to drop the column `microrregiao` on the `municipios` table. All the data in the column will be lost.
  - Added the required column `mrae` to the `municipios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nome_normalizado` to the `municipios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bens" ADD COLUMN     "busca_texto" TEXT,
ADD COLUMN     "dados_complementares" JSONB;

-- AlterTable
ALTER TABLE "municipios" DROP COLUMN "microrregiao",
ADD COLUMN     "mrae" TEXT NOT NULL,
ADD COLUMN     "nome_normalizado" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "bens_busca_texto_idx" ON "bens"("busca_texto");
