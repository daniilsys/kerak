import type { RecipeRequest } from "@kerak/types";

const RECIPE_SCHEMA = '{"recipes":[{"name":"str","duration":min,"difficulty":"easy|medium|hard","calories":kcal/pers,"ingredients":[{"name":"str","quantity":"str"}],"steps":[{"stepNumber":n,"title":"str","description":"str","duration":min,"tip":"str|null"}]}]}';

export function buildRecipePrompt(
  req: RecipeRequest,
  preferences?: { maxCalories?: number; difficulty?: string | null },
): string {
  const rules = [
    `Ingrédients : ${req.ingredients.join(", ")}. Peut ajouter des basiques.`,
    `Quantités pour ${req.servings} pers.`,
    "Étapes détaillées : températures, temps, signes visuels, conseil si erreur.",
    "Calories réalistes. Tri facile→difficile.",
  ];
  if (preferences?.maxCalories) rules.push(`Max ${preferences.maxCalories} kcal/pers.`);
  if (preferences?.difficulty) rules.push(`Difficulté : ${preferences.difficulty} uniquement.`);

  return `3 recettes ${req.language === "en" ? "in English" : "en français"}, ${req.servings} pers.
${rules.map((r) => `- ${r}`).join("\n")}
JSON uniquement : ${RECIPE_SCHEMA}`;
}
