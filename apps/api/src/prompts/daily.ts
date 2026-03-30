const RECIPE_SCHEMA = '{"recipes":[{"name":"str","duration":min,"difficulty":"easy|medium|hard","calories":kcal/pers,"ingredients":[{"name":"str","quantity":"str"}],"steps":[{"stepNumber":n,"title":"str","description":"str","duration":min,"tip":"str|null"}]}]}';

export function buildDailyRecipePrompt(): string {
  const months = ["jan","fév","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"];
  const now = new Date();

  return `3 recettes du jour en français, 1 pers, ${now.getDate()} ${months[now.getMonth()]}.
- Ingrédients de saison. 1 facile (≤20min), 1 moyenne, 1 élaborée.
- Variété (pas 2 du même type). Quantités précises, étapes claires, calories réalistes.
JSON uniquement : ${RECIPE_SCHEMA}`;
}
