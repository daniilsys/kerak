-- CreateTable
CREATE TABLE "daily_recipes" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "recipes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_recipes_date_key" ON "daily_recipes"("date");
