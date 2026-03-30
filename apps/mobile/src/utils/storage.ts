import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserProfile } from "./calories";

const PROFILE_KEY = "kerak_user_profile";
const CALORIES_KEY = "kerak_daily_calories";

export async function saveProfile(
  profile: UserProfile,
  calories: number,
): Promise<void> {
  await AsyncStorage.multiSet([
    [PROFILE_KEY, JSON.stringify(profile)],
    [CALORIES_KEY, calories.toString()],
  ]);
}

export async function loadProfile(): Promise<{
  profile: UserProfile;
  calories: number;
} | null> {
  const values = await AsyncStorage.multiGet([PROFILE_KEY, CALORIES_KEY]);
  const profileStr = values[0][1];
  const caloriesStr = values[1][1];
  if (!profileStr || !caloriesStr) return null;
  return {
    profile: JSON.parse(profileStr),
    calories: parseInt(caloriesStr, 10),
  };
}

export async function clearProfile(): Promise<void> {
  await AsyncStorage.multiRemove([PROFILE_KEY, CALORIES_KEY]);
}

const THEME_KEY = "kerak_theme";

export async function saveTheme(name: string): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, name);
}

export async function loadTheme(): Promise<string | null> {
  return AsyncStorage.getItem(THEME_KEY);
}

const PREFS_KEY = "kerak_recipe_prefs";

export interface RecipePrefsLocal {
  maxCalories?: number;
  difficulty?: "easy" | "medium" | "hard" | null;
}

export async function saveRecipePrefs(prefs: RecipePrefsLocal): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export async function loadRecipePrefs(): Promise<RecipePrefsLocal | null> {
  const raw = await AsyncStorage.getItem(PREFS_KEY);
  return raw ? JSON.parse(raw) : null;
}

const RECENT_MEALS_KEY = "kerak_recent_meals";

export async function saveRecentMeal(meal: { label: string; calories: number }): Promise<void> {
  const raw = await AsyncStorage.getItem(RECENT_MEALS_KEY);
  const recent: any[] = raw ? JSON.parse(raw) : [];
  const filtered = recent.filter((m) => m.label !== meal.label);
  filtered.unshift(meal);
  await AsyncStorage.setItem(RECENT_MEALS_KEY, JSON.stringify(filtered.slice(0, 15)));
}

export async function getRecentMeals(): Promise<{ label: string; calories: number }[]> {
  const raw = await AsyncStorage.getItem(RECENT_MEALS_KEY);
  return raw ? JSON.parse(raw) : [];
}

const NOTIF_KEY = "kerak_notif_prefs";

export async function saveNotifPrefs(prefs: any): Promise<void> {
  await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
}

export async function loadNotifPrefs(): Promise<any | null> {
  const raw = await AsyncStorage.getItem(NOTIF_KEY);
  return raw ? JSON.parse(raw) : null;
}
