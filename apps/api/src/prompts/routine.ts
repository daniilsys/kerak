const ALL_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const FR: Record<string, string> = {
  monday: "lundi", tuesday: "mardi", wednesday: "mercredi",
  thursday: "jeudi", friday: "vendredi", saturday: "samedi", sunday: "dimanche",
};

export interface RoutineOptions {
  includeSnacks?: boolean;
  budget?: "low" | "medium" | "high";
  cookingLevel?: "beginner" | "intermediate" | "advanced";
  eatingOut?: string[];
  dietary?: string[];
}

export function buildRoutinePrompt(opts: {
  dailyTarget: number;
  startDay?: string;
  favorites?: string[];
  preferences?: { maxCalories?: number | null; difficulty?: string | null };
  options?: RoutineOptions;
}): string {
  const startIdx = Math.max(0, opts.startDay ? ALL_DAYS.indexOf(opts.startDay as any) : 0);
  const days = ALL_DAYS.slice(startIdx);
  const dayList = days.map((d) => FR[d]).join(", ");

  const hasSnacks = !!opts.options?.includeSnacks;
  const mealsPerDay = hasSnacks
    ? "4 repas/jour : petit-déjeuner (breakfast), déjeuner (lunch), goûter/encas (snack), dîner (dinner). Le snack est OBLIGATOIRE pour chaque jour."
    : "3 repas/jour : petit-déjeuner (breakfast), déjeuner (lunch), dîner (dinner)";
  const mealKeys = hasSnacks
    ? '"breakfast":{...},"lunch":{...},"snack":{...},"dinner":{...}'
    : '"breakfast":{...},"lunch":{...},"dinner":{...}';

  const rules = [
    `${days.length} jours (${dayList}), 1 pers, objectif ${opts.dailyTarget} kcal/jour.`,
    `${mealsPerDay}, total ±100 kcal de l'objectif.`,
    "Variété, alterner protéines/féculents/légumes.",
    "Ingrédients principaux (3-5 avec quantités) + description courte.",
  ];

  if (opts.options?.budget === "low") rules.push("Budget serré : ingrédients bon marché, pas de produits luxe, maximiser les protéines peu chères (œufs, légumineuses, poulet).");
  if (opts.options?.budget === "high") rules.push("Pas de contrainte budget, varier les ingrédients premium.");

  if (opts.options?.cookingLevel === "beginner") rules.push("Recettes très simples, max 20 min de préparation, pas de technique avancée.");
  if (opts.options?.cookingLevel === "advanced") rules.push("Recettes élaborées, techniques variées.");

  if (opts.options?.dietary?.length) rules.push(`Régime : ${opts.options.dietary.join(", ")}.`);

  if (opts.options?.eatingOut?.length) {
    const eatingOutStr = opts.options.eatingOut.map((e) => {
      const [day, meal] = e.split("_");
      return `${FR[day] ?? day} ${meal === "lunch" ? "midi" : meal === "dinner" ? "soir" : meal}`;
    }).join(", ");
    rules.push(`Repas à l'extérieur (ne pas planifier) : ${eatingOutStr}. Mettre "Repas libre" avec calories estimées à 600-800 kcal.`);
  }

  if (opts.favorites?.length) rules.push(`Inspiré de : ${opts.favorites.join(", ")}.`);
  if (opts.preferences?.difficulty) rules.push(`Difficulté : ${opts.preferences.difficulty}.`);

  return `Plan repas en français.
${rules.map((r) => `- ${r}`).join("\n")}
UNIQUEMENT : ${dayList}.
JSON : {"days":{"${days[0]}":{${mealKeys},"total":n},...}}
Format repas : {"name":"str","calories":n,"description":"str","ingredients":["qty ingrédient",...]}`;
}
