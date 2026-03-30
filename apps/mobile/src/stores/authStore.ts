import { create } from "zustand";
import {
  saveTokens,
  clearTokens,
  getAccessToken,
} from "../utils/auth";
import {
  saveProfile,
  loadProfile,
  clearProfile,
} from "../utils/storage";
import {
  register as apiRegister,
  login as apiLogin,
  type AuthResponse,
} from "../utils/api";
import type { UserProfile } from "../utils/calories";
import { calculateDailyCalories } from "../utils/calories";

export interface AuthUser {
  id: string;
  email: string;
  dailyCalories: number;
}

interface AuthState {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;

  hydrate: () => Promise<void>;

  register: (
    email: string,
    password: string,
    profile: UserProfile,
  ) => Promise<void>;

  login: (email: string, password: string) => Promise<void>;

  setProfile: (profile: UserProfile) => Promise<void>;

  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoggedIn: false,
  isLoading: true,

  hydrate: async () => {
    const [data, token] = await Promise.all([loadProfile(), getAccessToken()]);
    set({
      profile: data?.profile ?? null,
      isLoggedIn: token !== null,
      isLoading: false,
    });
  },

  register: async (email, password, profile) => {
    const calories = calculateDailyCalories(profile);
    const data: AuthResponse = await apiRegister(email, password, {
      gender: profile.gender,
      age: profile.age,
      height: profile.height,
      weight: profile.weight,
      activityLevel: profile.activityLevel,
      goal: profile.goal,
      dailyCalories: calories,
    });
    await saveProfile(profile, calories);
    set({
      user: data.user,
      profile,
      isLoggedIn: true,
    });
  },

  login: async (email, password) => {
    const data: AuthResponse = await apiLogin(email, password);
    set({
      user: data.user,
      isLoggedIn: true,
    });
  },

  setProfile: async (profile) => {
    const calories = calculateDailyCalories(profile);
    await saveProfile(profile, calories);
    set({ profile });
  },

  logout: async () => {
    await clearProfile();
    await clearTokens();
    set({
      user: null,
      profile: null,
      isLoggedIn: false,
    });
  },
}));
