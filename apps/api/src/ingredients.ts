import { prisma } from "./db.js";

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface IngredientResult {
  id: string;
  name: string;
  calories: number | null;
  proteins: number | null;
  carbs: number | null;
  fats: number | null;
  fiber: number | null;
}

export async function searchIngredients(
  query: string,
  limit = 15,
): Promise<IngredientResult[]> {
  const q = normalize(query);
  if (q.length === 0) return [];

  const results = await prisma.ingredient.findMany({
    where: {
      normalized: { contains: q },
    },
    take: 100,
    orderBy: { name: "asc" },
  });

  const terms = q.split(" ").filter(Boolean);
  const scored: { ing: typeof results[number]; score: number }[] = [];

  for (const ing of results) {
    const n = ing.normalized;

    if (n === q) {
      scored.push({ ing, score: 100 });
      continue;
    }
    if (n.startsWith(q)) {
      scored.push({ ing, score: 80 - Math.min(n.length - q.length, 30) });
      continue;
    }

    const allMatch = terms.every((t) => n.includes(t));
    if (allMatch) {
      const words = n.split(" ");
      const bonus = terms.reduce((acc, t) => acc + (words.some((w) => w.startsWith(t)) ? 10 : 0), 0);
      scored.push({ ing, score: 40 + bonus - Math.min(n.length, 30) });
      continue;
    }

    scored.push({ ing, score: 10 - Math.min(n.length, 20) });
  }

  for (const s of scored) {
    if (s.ing.calories != null) s.score += 15;
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ ing }) => ({
    id: ing.id,
    name: ing.name,
    calories: ing.calories,
    proteins: ing.proteins,
    carbs: ing.carbs,
    fats: ing.fats,
    fiber: ing.fiber,
  }));
}
