import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  const {
    email,
    password,
    gender,
    age,
    height,
    weight,
    activityLevel,
    goal,
    dailyCalories,
  } = req.body;

  if (!email || !password || !gender || !age || !dailyCalories) {
    res.status(400).json({ error: "Champs requis manquants" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email déjà utilisé" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      gender,
      age,
      height,
      weight,
      activityLevel,
      goal,
      dailyCalories,
    },
  });

  res.status(201).json({
    user: { id: user.id, email: user.email, dailyCalories: user.dailyCalories },
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email et mot de passe requis" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }

  res.json({
    user: { id: user.id, email: user.email, dailyCalories: user.dailyCalories },
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
  });
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: "Refresh token requis" });
    return;
  }

  try {
    const { userId } = verifyToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(401).json({ error: "Utilisateur introuvable" });
      return;
    }
    res.json({
      accessToken: signAccessToken(userId),
      refreshToken: signRefreshToken(userId),
    });
  } catch {
    res.status(401).json({ error: "Refresh token invalide" });
  }
});

export default router;
