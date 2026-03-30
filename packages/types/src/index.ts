export interface RecipePreferences {
  maxCalories?: number;
  difficulty?: "easy" | "medium" | "hard" | null;
}

export interface RecipeRequest {
  ingredients: string[];
  servings: number;
  language?: "fr" | "en";
  preferences?: RecipePreferences;
}

export interface Ingredient {
  name: string;
  quantity: string;
}

export interface Step {
  stepNumber: number;
  title: string;
  description: string;
  duration?: number;
  tip?: string;
}

export interface Recipe {
  name: string;
  duration: number;
  difficulty: "easy" | "medium" | "hard";
  calories: number;
  ingredients: Ingredient[];
  steps: Step[];
}

export interface RecipeResponse {
  recipes: Recipe[];
}
