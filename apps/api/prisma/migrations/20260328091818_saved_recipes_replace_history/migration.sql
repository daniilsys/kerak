/*
  Warnings:

  - You are about to drop the `recipes_history` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "recipes_history" DROP CONSTRAINT "recipes_history_userId_fkey";

-- DropTable
DROP TABLE "recipes_history";

-- CreateTable
CREATE TABLE "saved_recipes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipe" JSONB NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_recipes_userId_completedAt_idx" ON "saved_recipes"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "saved_recipes_userId_favorite_idx" ON "saved_recipes"("userId", "favorite");

-- AddForeignKey
ALTER TABLE "saved_recipes" ADD CONSTRAINT "saved_recipes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
