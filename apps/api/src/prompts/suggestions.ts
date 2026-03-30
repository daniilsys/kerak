const RECIPE_SCHEMA = '{"recipes":[{"name":"str","duration":min,"difficulty":"easy|medium|hard","calories":kcal/pers,"ingredients":[{"name":"str","quantity":"str"}],"steps":[{"stepNumber":n,"title":"str","description":"str","duration":min,"tip":"str|null"}]}]}';

export function buildSuggestionsPrompt(
  favorites: { name: string; ingredients: string[] }[],
  preferences?: { maxCalories?: number | null; difficulty?: string | null },
): string {
  const favList = favorites.map((f) => `${f.name} (${f.ingredients.slice(0, 4).join(", ")})`).join(" ; ");

  const rules: string[] = [
    "3 recettes NOUVELLES inspirées de ses goûts mais différentes.",
    "Quantités pour 1 pers, étapes détaillées, calories réalistes.",
  ];
  if (preferences?.maxCalories) rules.push(`Max ${preferences.maxCalories} kcal/pers.`);
  if (preferences?.difficulty) rules.push(`Difficulté : ${preferences.difficulty}.`);

  return `Favoris : ${favList}
${rules.map((r) => `- ${r}`).join("\n")}
JSON uniquement : ${RECIPE_SCHEMA}`;
}
