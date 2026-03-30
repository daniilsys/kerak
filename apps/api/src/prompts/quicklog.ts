export function buildQuickLogPrompt(text: string, hour: number): string {
  return `Nutritionniste. Analyse ce repas en français : "${text}"
Estime calories, protéines, glucides, lipides, fibres pour chaque aliment. Gère les approximations et les plats composés.
Détermine aussi le type de repas : "breakfast" (petit-déj), "lunch" (déjeuner), "dinner" (dîner) ou "snack" (encas/grignotage). Heure actuelle : ${hour}h. Si c'est un encas (fruit, café, biscuit, yaourt, etc.) mets "snack" peu importe l'heure.
JSON : {"mealType":"breakfast|lunch|dinner|snack","items":[{"label":"str","calories":n,"proteins":n,"carbs":n,"fats":n,"fiber":n}]}`;
}
