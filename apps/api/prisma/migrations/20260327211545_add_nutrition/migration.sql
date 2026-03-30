-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "calories" DOUBLE PRECISION,
ADD COLUMN     "carbs" DOUBLE PRECISION,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "fats" DOUBLE PRECISION,
ADD COLUMN     "fiber" DOUBLE PRECISION,
ADD COLUMN     "proteins" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "ingredients_code_idx" ON "ingredients"("code");
