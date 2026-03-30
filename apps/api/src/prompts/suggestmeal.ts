export function buildSuggestMealPrompt(opts: {
  remainingCalories: number;
  remainingMacros: { proteins: number; carbs: number; fats: number };
  context: "je_cuisine" | "on_me_cuisine" | "je_mange_dehors";
}): string {
  const contextLabel = {
    je_cuisine: "L'utilisateur cuisine lui-même. Suggère des recettes rapides (≤20 min).",
    on_me_cuisine: "Quelqu'un cuisine pour l'utilisateur. Suggère des plats à demander avec portions adaptées.",
    je_mange_dehors: "L'utilisateur mange au restaurant/fast-food. Suggère des choix intelligents avec estimations (ex: 'kebab sans frites + eau ≈ 550 kcal').",
  }[opts.context];

  return `Nutritionniste bienveillant. Il reste ~${opts.remainingCalories} kcal et ${opts.remainingMacros.proteins}g prot, ${opts.remainingMacros.carbs}g gluc, ${opts.remainingMacros.fats}g lip.
${contextLabel}
2-3 suggestions qui rentrent dans le budget. Ton positif et non-culpabilisant.
JSON : {"suggestions":[{"title":"str","description":"str","estimatedCalories":n,"tip":"str"}]}`;
}
