export function buildNutritionAnalysisPrompt(opts: {
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  avgFiber: number;
  avgCalories: number;
  goal: string;
  days: number;
}): string {
  const goalFr = opts.goal === "lose" ? "perte de poids" : opts.goal === "gain" ? "prise de masse" : "maintien";

  return `Nutritionniste. Macros moyennes sur ${opts.days}j : ${opts.avgCalories} kcal, ${opts.avgProtein}g prot, ${opts.avgCarbs}g gluc, ${opts.avgFats}g lip, ${opts.avgFiber}g fibres. Objectif : ${goalFr}.
3 conseils courts et bienveillants en français.
JSON : {"advice":["conseil1","conseil2","conseil3"]}`;
}
