import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { maxCalories: true, difficultyPref: true },
  });
  res.json(user ?? { maxCalories: null, difficultyPref: null });
});

router.put("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { maxCalories, difficultyPref } = req.body;
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      maxCalories: maxCalories ?? null,
      difficultyPref: difficultyPref ?? null,
    },
    select: { maxCalories: true, difficultyPref: true },
  });
  res.json(user);
});

export default router;
