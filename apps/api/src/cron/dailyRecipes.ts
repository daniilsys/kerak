import cron from "node-cron";
import { Mistral } from "@mistralai/mistralai";
import { prisma } from "../db.js";
import { buildDailyRecipePrompt } from "../prompts/daily.js";

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function generateDailyRecipes(): Promise<void> {
  const today = todayDate();

  const existing = await prisma.dailyRecipe.findUnique({
    where: { date: new Date(today) },
  });
  if (existing) {
    console.log(`[daily] Recipes already exist for ${today}`);
    return;
  }

  console.log(`[daily] Generating recipes for ${today}...`);

  const prompt = buildDailyRecipePrompt();
  const response = await mistral.chat.complete({
    model: "mistral-small-latest",
    messages: [{ role: "user", content: prompt }],
    responseFormat: { type: "json_object" },
  });

  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    console.error("[daily] Empty response from Mistral");
    return;
  }

  const data = JSON.parse(content);

  await prisma.dailyRecipe.create({
    data: {
      date: new Date(today),
      recipes: data.recipes,
    },
  });

  console.log(`[daily] ${data.recipes.length} recipes saved for ${today}`);
}

export function scheduleDailyRecipes(): void {
  cron.schedule("0 5 * * *", async () => {
    try {
      await generateDailyRecipes();
    } catch (err) {
      console.error("[daily] Cron error:", err);
    }
  });

  console.log("[daily] Cron scheduled: 5:00 AM daily");

  generateDailyRecipes().catch((err) =>
    console.error("[daily] Startup generation error:", err),
  );
}
