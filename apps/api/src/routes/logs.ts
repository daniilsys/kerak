import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { mistral } from "../mistral.js";
import { buildQuickLogPrompt } from "../prompts/quicklog.js";

const router = Router();
router.use(requireAuth);

router.post("/", async (req, res) => {
  const userId = (req as any).userId;
  const { date, meal, label, calories, ingredientId, grams } = req.body;

  if (!date || !meal || !label || calories == null) {
    res.status(400).json({ error: "date, meal, label et calories requis" });
    return;
  }

  const log = await prisma.foodLog.create({
    data: {
      userId,
      date: new Date(date),
      meal,
      label,
      calories,
      ...(ingredientId && { ingredientId }),
      ...(grams && { grams }),
    },
  });

  res.status(201).json(log);
});

router.post("/quick", async (req, res) => {
  const { text, date, hour } = req.body;

  if (!text || !date) {
    res.status(400).json({ error: "text et date requis" });
    return;
  }

  const prompt = buildQuickLogPrompt(text, hour ?? new Date().getHours());

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
  res.json({ items: data.items ?? [], mealType: data.mealType ?? "lunch" });
});

router.post("/quick/confirm", async (req, res) => {
  const userId = (req as any).userId;
  const { items, mealType, date } = req.body;

  if (!items?.length || !mealType || !date) {
    res.status(400).json({ error: "items, mealType et date requis" });
    return;
  }

  const logs = await Promise.all(
    items.map((item: { label: string; calories: number; proteins?: number; carbs?: number; fats?: number; fiber?: number }) =>
      prisma.foodLog.create({
        data: {
          userId,
          date: new Date(date),
          meal: mealType,
          label: item.label,
          calories: item.calories,
        },
      }),
    ),
  );

  res.status(201).json({ logs });
});

router.get("/nutrition", async (req, res) => {
  const userId = (req as any).userId;
  const from = typeof req.query.from === "string" ? req.query.from : "";
  const to = typeof req.query.to === "string" ? req.query.to : "";

  if (!from || !to) {
    res.status(400).json({ error: "from and to required" });
    return;
  }

  const logs = await prisma.foodLog.findMany({
    where: {
      userId,
      date: { gte: new Date(from), lte: new Date(to) },
      ingredientId: { not: null },
      grams: { not: null },
    },
  });

  if (logs.length === 0) {
    res.json({
      totalProtein: 0, totalCarbs: 0, totalFats: 0, totalFiber: 0,
      avgProtein: 0, avgCarbs: 0, avgFats: 0, avgFiber: 0,
      avgCalories: 0, days: 0,
    });
    return;
  }

  const ingredientIds = [...new Set(logs.map((l) => l.ingredientId!))];
  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds } },
  });
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));

  let totalProtein = 0, totalCarbs = 0, totalFats = 0, totalFiber = 0, totalCal = 0;

  for (const log of logs) {
    const ing = ingMap.get(log.ingredientId!);
    if (!ing || !log.grams) continue;
    const ratio = log.grams / 100;
    totalProtein += (ing.proteins ?? 0) * ratio;
    totalCarbs += (ing.carbs ?? 0) * ratio;
    totalFats += (ing.fats ?? 0) * ratio;
    totalFiber += (ing.fiber ?? 0) * ratio;
    totalCal += log.calories;
  }

  const daySet = new Set(logs.map((l) => l.date.toISOString().slice(0, 10)));
  const days = daySet.size || 1;

  res.json({
    totalProtein: Math.round(totalProtein),
    totalCarbs: Math.round(totalCarbs),
    totalFats: Math.round(totalFats),
    totalFiber: Math.round(totalFiber),
    avgProtein: Math.round(totalProtein / days),
    avgCarbs: Math.round(totalCarbs / days),
    avgFats: Math.round(totalFats / days),
    avgFiber: Math.round(totalFiber / days),
    avgCalories: Math.round(totalCal / days),
    days,
  });
});

router.get("/range", async (req, res) => {
  const userId = (req as any).userId;
  const from = typeof req.query.from === "string" ? req.query.from : "";
  const to = typeof req.query.to === "string" ? req.query.to : "";

  if (!from || !to) {
    res.status(400).json({ error: "from and to query params required" });
    return;
  }

  const logs = await prisma.foodLog.groupBy({
    by: ["date"],
    where: {
      userId,
      date: { gte: new Date(from), lte: new Date(to) },
    },
    _sum: { calories: true },
    _count: true,
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyCalories: true },
  });
  const target = user?.dailyCalories ?? 2000;

  const days = logs.map((l) => ({
    date: l.date.toISOString().slice(0, 10),
    total: l._sum.calories ?? 0,
    target,
    count: l._count,
  }));

  res.json({ days });
});

router.get("/:date", async (req, res) => {
  const userId = (req as any).userId;
  const date = new Date(req.params.date);

  const logs = await prisma.foodLog.findMany({
    where: { userId, date },
    orderBy: { createdAt: "asc" },
  });

  res.json({ logs });
});

router.get("/summary/:date", async (req, res) => {
  const userId = (req as any).userId;
  const date = new Date(req.params.date);

  const logs = await prisma.foodLog.findMany({
    where: { userId, date },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyCalories: true },
  });

  const total = logs.reduce((sum, l) => sum + l.calories, 0);
  const byMeal: Record<string, number> = {};
  for (const log of logs) {
    byMeal[log.meal] = (byMeal[log.meal] || 0) + log.calories;
  }

  res.json({
    date: req.params.date,
    target: user?.dailyCalories ?? 0,
    total,
    remaining: (user?.dailyCalories ?? 0) - total,
    byMeal,
    count: logs.length,
  });
});

router.patch("/:id", async (req, res) => {
  const userId = (req as any).userId;
  const log = await prisma.foodLog.findUnique({ where: { id: req.params.id } });
  if (!log || log.userId !== userId) {
    res.status(404).json({ error: "Log introuvable" });
    return;
  }
  const { label, calories } = req.body;
  const updated = await prisma.foodLog.update({
    where: { id: req.params.id },
    data: {
      ...(label !== undefined && { label }),
      ...(calories !== undefined && { calories }),
    },
  });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).userId;
  const log = await prisma.foodLog.findUnique({ where: { id: req.params.id } });
  if (!log || log.userId !== userId) {
    res.status(404).json({ error: "Log introuvable" });
    return;
  }
  await prisma.foodLog.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
