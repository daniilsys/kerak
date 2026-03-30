import "dotenv/config";
import express from "express";
import type { RecipeRequest, RecipeResponse } from "@kerak/types";
import { buildRecipePrompt } from "./prompts/recipes.js";
import { searchIngredients } from "./ingredients.js";
import { prisma } from "./db.js";
import { requireAuth } from "./middleware/auth.js";
import authRouter from "./routes/auth.js";
import logsRouter from "./routes/logs.js";
import preferencesRouter from "./routes/preferences.js";
import { scheduleDailyRecipes } from "./cron/dailyRecipes.js";
import { buildSuggestionsPrompt } from "./prompts/suggestions.js";
import { buildRoutinePrompt } from "./prompts/routine.js";
import { buildNutritionAnalysisPrompt } from "./prompts/nutrition.js";
import { buildSuggestMealPrompt } from "./prompts/suggestmeal.js";
import { mistral } from "./mistral.js";

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);

app.get("/ingredients/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  if (q.length === 0) {
    res.json({ results: [] });
    return;
  }
  const results = await searchIngredients(q);
  res.json({ results });
});

app.use("/logs", logsRouter);
app.use("/preferences", preferencesRouter);

app.post("/recipes", async (req, res) => {
  const body = req.body as RecipeRequest & { userId?: string };

  if (!body.ingredients?.length || !body.servings) {
    res.status(400).json({
      error: "ingredients (string[]) and servings (number) are required",
    });
    return;
  }

  const prompt = buildRecipePrompt(
    {
      ingredients: body.ingredients,
      servings: body.servings,
      language: body.language ?? "fr",
    },
    body.preferences,
  );

  const response = await mistral.chat.complete({
    model: "mistral-small-latest",
    messages: [{ role: "user", content: prompt }],
    responseFormat: { type: "json_object" },
  });

  const content = response.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    res.status(502).json({ error: "Empty response from Mistral" });
    return;
  }

  const data: RecipeResponse = JSON.parse(content);
  res.json(data);
});

app.get("/recipes/daily", async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const daily = await prisma.dailyRecipe.findUnique({
    where: { date: new Date(today) },
  });
  if (!daily) {
    res.json({ recipes: [], date: today });
    return;
  }
  res.json({ recipes: daily.recipes, date: today });
});

app.post("/recipes/complete", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { recipe } = req.body;
  if (!recipe) {
    res.status(400).json({ error: "recipe object required" });
    return;
  }
  const saved = await prisma.savedRecipe.create({
    data: { userId, recipe: recipe as any },
  });
  res.status(201).json(saved);
});

app.patch("/recipes/saved/:id/favorite", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const existing = await prisma.savedRecipe.findUnique({
    where: { id: req.params.id.toString() },
  });
  if (!existing || existing.userId !== userId) {
    res.status(404).json({ error: "Recette introuvable" });
    return;
  }
  const updated = await prisma.savedRecipe.update({
    where: { id: req.params.id.toString() },
    data: { favorite: !existing.favorite },
  });
  res.json(updated);
});

app.delete("/recipes/saved/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const id = req.params.id as string;
  const existing = await prisma.savedRecipe.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    res.status(404).json({ error: "Recette introuvable" });
    return;
  }
  await prisma.savedRecipe.delete({ where: { id } });
  res.json({ ok: true });
});

app.get("/recipes/saved", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const favOnly = req.query.favorites === "true";
  const saved = await prisma.savedRecipe.findMany({
    where: { userId, ...(favOnly && { favorite: true }) },
    orderBy: { completedAt: "desc" },
    take: 50,
  });
  res.json({ recipes: saved });
});

function getMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

app.post("/routines/generate", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const monday = getMonday();
  const mondayStr = monday.toISOString().slice(0, 10);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyCalories: true, maxCalories: true, difficultyPref: true },
  });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const favorites = await prisma.savedRecipe.findMany({
    where: { userId, favorite: true },
    orderBy: { completedAt: "desc" },
    take: 5,
  });
  const favNames = favorites.map((f) => (f.recipe as any).name);

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayDayName = dayNames[new Date().getDay()];

  const prompt = buildRoutinePrompt({
    dailyTarget: user.dailyCalories,
    startDay: todayDayName,
    favorites: favNames.length > 0 ? favNames : undefined,
    preferences: { maxCalories: user.maxCalories, difficulty: user.difficultyPref },
    options: req.body.options,
  });

  const response = await mistral.chat.complete({
    model: "mistral-small-latest",
    messages: [{ role: "user", content: prompt }],
    responseFormat: { type: "json_object" },
  });

  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    res.status(502).json({ error: "Empty response" });
    return;
  }

  const plan = JSON.parse(content);

  const routine = await prisma.weeklyRoutine.upsert({
    where: { userId_weekStart: { userId, weekStart: new Date(mondayStr) } },
    update: { plan: plan.days ?? plan, target: user.dailyCalories },
    create: {
      userId,
      weekStart: new Date(mondayStr),
      plan: plan.days ?? plan,
      target: user.dailyCalories,
    },
  });

  res.json(routine);
});

app.get("/routines/current", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const monday = getMonday();
  const mondayStr = monday.toISOString().slice(0, 10);

  const routine = await prisma.weeklyRoutine.findUnique({
    where: { userId_weekStart: { userId, weekStart: new Date(mondayStr) } },
  });

  res.json(routine ?? null);
});

app.patch("/routines/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const id = req.params.id as string;
  const routine = await prisma.weeklyRoutine.findUnique({ where: { id } });
  if (!routine || routine.userId !== userId) {
    res.status(404).json({ error: "Routine introuvable" });
    return;
  }
  const { plan } = req.body;
  if (!plan) { res.status(400).json({ error: "plan required" }); return; }
  const updated = await prisma.weeklyRoutine.update({
    where: { id },
    data: { plan },
  });
  res.json(updated);
});

app.delete("/routines/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const id = req.params.id as string;
  const routine = await prisma.weeklyRoutine.findUnique({ where: { id } });
  if (!routine || routine.userId !== userId) {
    res.status(404).json({ error: "Routine introuvable" });
    return;
  }
  await prisma.weeklyRoutine.delete({ where: { id } });
  res.json({ ok: true });
});

app.post("/logs/nutrition/analyze", requireAuth, async (req, res) => {
  const { avgProtein, avgCarbs, avgFats, avgFiber, avgCalories, days } = req.body;
  const userId = (req as any).userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { goal: true },
  });

  const prompt = buildNutritionAnalysisPrompt({
    avgProtein: avgProtein ?? 0,
    avgCarbs: avgCarbs ?? 0,
    avgFats: avgFats ?? 0,
    avgFiber: avgFiber ?? 0,
    avgCalories: avgCalories ?? 0,
    goal: user?.goal ?? "maintain",
    days: days ?? 1,
  });

  const response = await mistral.chat.complete({
    model: "mistral-small-latest",
    messages: [{ role: "user", content: prompt }],
    responseFormat: { type: "json_object" },
  });

  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    res.status(502).json({ error: "Empty response" });
    return;
  }

  const data = JSON.parse(content);
  res.json({ advice: data.advice ?? [] });
});

app.post("/recipes/suggestions", requireAuth, async (req, res) => {
  const userId = (req as any).userId;

  const favorites = await prisma.savedRecipe.findMany({
    where: { userId, favorite: true },
    orderBy: { completedAt: "desc" },
    take: 5,
  });

  if (favorites.length < 2) {
    const today = new Date().toISOString().slice(0, 10);
    const daily = await prisma.dailyRecipe.findUnique({
      where: { date: new Date(today) },
    });
    res.json({ recipes: daily?.recipes ?? [], source: "daily" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { maxCalories: true, difficultyPref: true },
  });

  const favData = favorites.map((f) => {
    const r = f.recipe as any;
    return {
      name: r.name,
      ingredients: (r.ingredients || []).map((i: any) => i.name),
    };
  });

  const prompt = buildSuggestionsPrompt(favData, {
    maxCalories: user?.maxCalories,
    difficulty: user?.difficultyPref,
  });

  const response = await mistral.chat.complete({
    model: "mistral-small-latest",
    messages: [{ role: "user", content: prompt }],
    responseFormat: { type: "json_object" },
  });

  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    res.status(502).json({ error: "Empty response" });
    return;
  }

  const data = JSON.parse(content);
  res.json({ recipes: data.recipes, source: "suggestions" });
});

app.post("/recipes/suggest-meal", requireAuth, async (req, res) => {
  const { remainingCalories, remainingMacros, context } = req.body;

  if (remainingCalories == null || !remainingMacros || !context) {
    res.status(400).json({ error: "remainingCalories, remainingMacros et context requis" });
    return;
  }

  const prompt = buildSuggestMealPrompt({ remainingCalories, remainingMacros, context });

  const response = await mistral.chat.complete({
    model: "mistral-small-latest",
    messages: [{ role: "user", content: prompt }],
    responseFormat: { type: "json_object" },
  });

  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    res.status(502).json({ error: "Empty response from Mistral" });
    return;
  }

  const data = JSON.parse(content);
  res.json({ suggestions: data.suggestions ?? [] });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
  scheduleDailyRecipes();
});
