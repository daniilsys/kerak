import type { RecipeResponse } from "@kerak/types";
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from "./auth";

const BASE = "http://192.168.1.19:3000";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function refreshAndRetry(
  url: string,
  init: RequestInit,
): Promise<Response | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!res.ok) {
    await clearTokens();
    return null;
  }

  const data = await res.json();
  await saveTokens(data.accessToken, data.refreshToken);

  const headers = { ...init.headers, Authorization: `Bearer ${data.accessToken}` };
  return fetch(url, { ...init, headers });
}

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const auth = await authHeaders();
  const headers = { ...init.headers, ...auth };
  let res = await fetch(url, { ...init, headers });

  if (res.status === 401 && auth.Authorization) {
    const retried = await refreshAndRetry(url, { ...init, headers });
    if (retried) res = retried;
  }

  return res;
}

export interface AuthResponse {
  user: { id: string; email: string; dailyCalories: number };
  accessToken: string;
  refreshToken: string;
}

export async function register(
  email: string,
  password: string,
  profile: {
    gender: string;
    age: number;
    height: number;
    weight: number;
    activityLevel: string;
    goal: string;
    dailyCalories: number;
  },
): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, ...profile }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erreur lors de l'inscription");
  }
  const data: AuthResponse = await res.json();
  await saveTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Identifiants incorrects");
  }
  const data: AuthResponse = await res.json();
  await saveTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function searchIngredients(
  query: string,
): Promise<{ id: string; name: string; calories: number | null; proteins: number | null; carbs: number | null; fats: number | null; fiber: number | null }[]> {
  const res = await fetch(
    `${BASE}/ingredients/search?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.results;
}

export async function getPreferences(): Promise<{ maxCalories: number | null; difficultyPref: string | null }> {
  const res = await authFetch(`${BASE}/preferences`);
  if (!res.ok) return { maxCalories: null, difficultyPref: null };
  return res.json();
}

export async function updatePreferences(prefs: { maxCalories?: number | null; difficultyPref?: string | null }): Promise<void> {
  await authFetch(`${BASE}/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
}

export async function generateRecipes(
  ingredients: string[],
  servings: number,
  preferences?: { maxCalories?: number; difficulty?: string | null },
): Promise<RecipeResponse> {
  const res = await authFetch(`${BASE}/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients, servings, preferences }),
  });
  if (!res.ok) throw new Error("Erreur lors de la génération");
  return res.json();
}

export async function completeRecipe(recipe: any): Promise<void> {
  await authFetch(`${BASE}/recipes/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipe }),
  }).catch(() => {});
}

export interface RoutineOptions {
  includeSnacks?: boolean;
  budget?: "low" | "medium" | "high";
  cookingLevel?: "beginner" | "intermediate" | "advanced";
  eatingOut?: string[];
  dietary?: string[];
}

export async function generateRoutine(options?: RoutineOptions): Promise<any> {
  const res = await authFetch(`${BASE}/routines/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ options }),
  });
  if (!res.ok) throw new Error("Erreur lors de la génération");
  return res.json();
}

export async function getCurrentRoutine(): Promise<any | null> {
  const res = await authFetch(`${BASE}/routines/current`);
  if (!res.ok) return null;
  return res.json();
}

export async function updateRoutinePlan(id: string, plan: any): Promise<any> {
  const res = await authFetch(`${BASE}/routines/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error("Erreur");
  return res.json();
}

export async function deleteRoutine(id: string): Promise<void> {
  await authFetch(`${BASE}/routines/${id}`, { method: "DELETE" });
}

export async function getSuggestions(): Promise<RecipeResponse & { source: string }> {
  const res = await authFetch(`${BASE}/recipes/suggestions`, { method: "POST" });
  if (!res.ok) return { recipes: [], source: "error" };
  return res.json();
}

export async function deleteSavedRecipe(id: string): Promise<void> {
  await authFetch(`${BASE}/recipes/saved/${id}`, { method: "DELETE" });
}

export async function toggleFavorite(id: string): Promise<void> {
  await authFetch(`${BASE}/recipes/saved/${id}/favorite`, { method: "PATCH" });
}

export async function getSavedRecipes(favOnly = false): Promise<{ recipes: any[] }> {
  const res = await authFetch(`${BASE}/recipes/saved${favOnly ? "?favorites=true" : ""}`);
  if (!res.ok) return { recipes: [] };
  return res.json();
}

export async function getDailyRecipes(): Promise<RecipeResponse> {
  const res = await fetch(`${BASE}/recipes/daily`);
  if (!res.ok) return { recipes: [] };
  return res.json();
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadProfile } from "./storage";

const LOGS_KEY = "kerak_local_logs";

interface FoodLogEntry {
  id: string;
  date: string;
  meal: string;
  label: string;
  calories: number;
  createdAt: string;
}

async function getLocalLogs(): Promise<FoodLogEntry[]> {
  const raw = await AsyncStorage.getItem(LOGS_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveLocalLogs(logs: FoodLogEntry[]): Promise<void> {
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export async function addFoodLog(log: {
  date: string;
  meal: string;
  label: string;
  calories: number;
  ingredientId?: string;
  grams?: number;
}) {
  const token = await getAccessToken();

  if (token) {
    const res = await authFetch(`${BASE}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    if (res.ok) return res.json();
  }

  const logs = await getLocalLogs();
  const entry: FoodLogEntry = {
    id: Date.now().toString(),
    ...log,
    createdAt: new Date().toISOString(),
  };
  logs.push(entry);
  await saveLocalLogs(logs);
  return entry;
}

export async function getDaySummary(date: string): Promise<{
  date: string;
  target: number;
  total: number;
  remaining: number;
  byMeal: Record<string, number>;
  count: number;
}> {
  const token = await getAccessToken();

  if (token) {
    const res = await authFetch(`${BASE}/logs/summary/${date}`);
    if (res.ok) return res.json();
  }

  const logs = await getLocalLogs();
  const dayLogs = logs.filter((l) => l.date === date);
  const total = dayLogs.reduce((s, l) => s + l.calories, 0);
  const byMeal: Record<string, number> = {};
  for (const l of dayLogs) {
    byMeal[l.meal] = (byMeal[l.meal] || 0) + l.calories;
  }
  const profileData = await loadProfile();
  const target = profileData?.calories ?? 2000;

  return { date, target, total, remaining: target - total, byMeal, count: dayLogs.length };
}

export async function getDayLogs(date: string) {
  const token = await getAccessToken();

  if (token) {
    const res = await authFetch(`${BASE}/logs/${date}`);
    if (res.ok) return res.json();
  }

  const logs = await getLocalLogs();
  return { logs: logs.filter((l) => l.date === date) };
}

export async function updateFoodLog(id: string, data: { label?: string; calories?: number }): Promise<void> {
  const token = await getAccessToken();
  if (token) {
    await authFetch(`${BASE}/logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return;
  }
  const logs = await getLocalLogs();
  const idx = logs.findIndex((l) => l.id === id);
  if (idx >= 0) {
    if (data.label !== undefined) logs[idx].label = data.label;
    if (data.calories !== undefined) logs[idx].calories = data.calories;
    await saveLocalLogs(logs);
  }
}

export async function deleteFoodLog(id: string): Promise<void> {
  const token = await getAccessToken();
  if (token) {
    await authFetch(`${BASE}/logs/${id}`, { method: "DELETE" });
    return;
  }
  const logs = await getLocalLogs();
  await saveLocalLogs(logs.filter((l) => l.id !== id));
}

export async function getNutritionData(from: string, to: string): Promise<{
  totalProtein: number; totalCarbs: number; totalFats: number; totalFiber: number;
  avgProtein: number; avgCarbs: number; avgFats: number; avgFiber: number;
  avgCalories: number; days: number;
}> {
  const res = await authFetch(`${BASE}/logs/nutrition?from=${from}&to=${to}`);
  if (!res.ok) return { totalProtein: 0, totalCarbs: 0, totalFats: 0, totalFiber: 0, avgProtein: 0, avgCarbs: 0, avgFats: 0, avgFiber: 0, avgCalories: 0, days: 0 };
  return res.json();
}

export async function analyzeNutrition(data: any): Promise<{ advice: string[] }> {
  const res = await authFetch(`${BASE}/logs/nutrition/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) return { advice: [] };
  return res.json();
}

export async function quickLogParse(text: string, date: string): Promise<{
  items: { label: string; calories: number; proteins: number; carbs: number; fats: number; fiber: number }[];
  mealType: string;
}> {
  const res = await authFetch(`${BASE}/logs/quick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, date, hour: new Date().getHours() }),
  });
  if (!res.ok) throw new Error("Erreur d'analyse");
  return res.json();
}

export async function quickLogConfirm(items: any[], mealType: string, date: string): Promise<void> {
  await authFetch(`${BASE}/logs/quick/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, mealType, date }),
  });
}

export async function suggestMeal(opts: {
  remainingCalories: number;
  remainingMacros: { proteins: number; carbs: number; fats: number };
  context: "je_cuisine" | "on_me_cuisine" | "je_mange_dehors";
}): Promise<{ suggestions: { title: string; description: string; estimatedCalories: number; tip: string }[] }> {
  const res = await authFetch(`${BASE}/recipes/suggest-meal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) return { suggestions: [] };
  return res.json();
}

export async function getLogsRange(from: string, to: string): Promise<{ days: { date: string; total: number; target: number; count: number }[] }> {
  const token = await getAccessToken();
  if (token) {
    const res = await authFetch(`${BASE}/logs/range?from=${from}&to=${to}`);
    if (res.ok) return res.json();
  }
  const logs = await getLocalLogs();
  const profileData = await loadProfile();
  const target = profileData?.calories ?? 2000;
  const dayMap: Record<string, number> = {};
  const countMap: Record<string, number> = {};
  for (const l of logs) {
    if (l.date >= from && l.date <= to) {
      dayMap[l.date] = (dayMap[l.date] || 0) + l.calories;
      countMap[l.date] = (countMap[l.date] || 0) + 1;
    }
  }
  const days = Object.keys(dayMap).map((date) => ({
    date,
    total: dayMap[date],
    target,
    count: countMap[date],
  }));
  return { days };
}
