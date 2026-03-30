import { create } from "zustand";
import {
  getDaySummary,
  getDayLogs,
  addFoodLog,
  updateFoodLog,
  deleteFoodLog,
  quickLogParse,
  quickLogConfirm,
} from "../utils/api";

export interface FoodLog {
  id: string;
  date: string;
  meal: string;
  label: string;
  calories: number;
  proteins?: number;
  carbs?: number;
  fats?: number;
  fiber?: number;
  createdAt: string;
}

export interface DaySummary {
  date: string;
  target: number;
  total: number;
  remaining: number;
  byMeal: Record<string, number>;
  count: number;
}

interface QuickLogItem {
  label: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fiber: number;
}

interface FoodState {
  date: string;
  logs: FoodLog[];
  summary: DaySummary | null;
  loading: boolean;

  setDate: (date: string) => Promise<void>;

  refresh: () => Promise<void>;

  addLog: (log: {
    meal: string;
    label: string;
    calories: number;
    ingredientId?: string;
    grams?: number;
  }) => Promise<void>;

  updateLog: (id: string, data: { label?: string; calories?: number }) => Promise<void>;

  deleteLog: (id: string) => Promise<void>;

  quickParse: (text: string) => Promise<{ items: QuickLogItem[]; mealType: string }>;

  quickConfirm: (items: QuickLogItem[], mealType: string) => Promise<void>;
}

function todayStr(): string {
  const now = new Date();
  if (now.getHours() < 5) now.setDate(now.getDate() - 1);
  return now.toISOString().slice(0, 10);
}

export const useFoodStore = create<FoodState>((set, get) => ({
  date: todayStr(),
  logs: [],
  summary: null,
  loading: false,

  setDate: async (date) => {
    set({ date });
    await get().refresh();
  },

  refresh: async () => {
    const { date } = get();
    set({ loading: true });
    try {
      const [summaryRes, logsRes] = await Promise.all([
        getDaySummary(date),
        getDayLogs(date),
      ]);
      set({
        summary: summaryRes,
        logs: logsRes.logs ?? [],
      });
    } catch {
    } finally {
      set({ loading: false });
    }
  },

  addLog: async (log) => {
    const { date } = get();
    await addFoodLog({ ...log, date });
    await get().refresh();
  },

  updateLog: async (id, data) => {
    await updateFoodLog(id, data);
    await get().refresh();
  },

  deleteLog: async (id) => {
    await deleteFoodLog(id);
    await get().refresh();
  },

  quickParse: async (text) => {
    const { date } = get();
    return quickLogParse(text, date);
  },

  quickConfirm: async (items, mealType) => {
    const { date } = get();
    await quickLogConfirm(items, mealType, date);
    await get().refresh();
  },
}));
