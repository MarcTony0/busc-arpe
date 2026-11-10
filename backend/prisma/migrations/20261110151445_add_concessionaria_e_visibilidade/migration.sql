-- AlterTable
ALTER TABLE "bens" ADD COLUMN     "concessionaria" TEXT NOT NULL DEFAULT 'VITA',
ADD COLUMN     "visivel" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "bens_concessionaria_idx" ON "bens"("concessionaria");

-- CreateIndex
CREATE INDEX "bens_visivel_idx" ON "bens"("visivel");
