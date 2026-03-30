-- AlterTable
ALTER TABLE "food_logs" ADD COLUMN     "grams" INTEGER,
ADD COLUMN     "ingredientId" TEXT;

-- CreateTable
CREATE TABLE "weekly_routines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "plan" JSONB NOT NULL,
    "target" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_routines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_routines_userId_weekStart_key" ON "weekly_routines"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "weekly_routines" ADD CONSTRAINT "weekly_routines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
