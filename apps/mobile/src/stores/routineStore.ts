import { create } from "zustand";
import {
  getCurrentRoutine,
  generateRoutine,
  updateRoutinePlan,
  deleteRoutine,
  type RoutineOptions,
} from "../utils/api";

export interface RoutineMeal {
  name: string;
  calories: number;
  ingredients?: string[];
}

export interface RoutineDayPlan {
  breakfast?: RoutineMeal;
  lunch?: RoutineMeal;
  snack?: RoutineMeal;
  dinner?: RoutineMeal;
}

export interface Routine {
  id: string;
  plan: Record<string, RoutineDayPlan>;
  createdAt?: string;
}

interface RoutineState {
  routine: Routine | null;
  loading: boolean;

  fetch: () => Promise<void>;

  generate: (options?: RoutineOptions) => Promise<void>;

  updatePlan: (plan: Record<string, RoutineDayPlan>) => Promise<void>;

  remove: () => Promise<void>;

  clear: () => void;
}

export const useRoutineStore = create<RoutineState>((set, get) => ({
  routine: null,
  loading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const data = await getCurrentRoutine();
      set({ routine: data });
    } catch {
    } finally {
      set({ loading: false });
    }
  },

  generate: async (options) => {
    set({ loading: true });
    try {
      const data = await generateRoutine(options);
      set({ routine: data });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
    set({ loading: false });
  },

  updatePlan: async (plan) => {
    const { routine } = get();
    if (!routine) return;
    const updated = await updateRoutinePlan(routine.id, plan);
    set({ routine: updated });
  },

  remove: async () => {
    const { routine } = get();
    if (!routine) return;
    await deleteRoutine(routine.id);
    set({ routine: null });
  },

  clear: () => set({ routine: null }),
}));
