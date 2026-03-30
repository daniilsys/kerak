import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "./stores/authStore";
import { useFoodStore } from "./stores/foodStore";
import { useRoutineStore } from "./stores/routineStore";
import type { UserProfile } from "./utils/calories";
import { calculateDailyCalories } from "./utils/calories";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import Onboarding from "./screens/Onboarding";
import Auth from "./screens/Auth";
import Dashboard from "./screens/Dashboard";
import Tracking from "./screens/Tracking";
import Settings from "./screens/Settings";
import Recipes from "./screens/Recipes";
import WeeklyRoutine from "./screens/WeeklyRoutine";
import CookFromRoutine from "./screens/CookFromRoutine";
import BottomTabBar from "./components/BottomTabBar";
import { setupNotificationHandler, scheduleMealReminders } from "./utils/notifications";
import { loadNotifPrefs } from "./utils/storage";

setupNotificationHandler();

type Screen = "loading" | "onboarding" | "auth" | "login" | "main";
export type Tab = "home" | "tracking" | "recettes" | "settings";

function AppContent() {
  const { C } = useTheme();

  const { profile, isLoggedIn, isLoading, hydrate, logout, setProfile } = useAuthStore();

  const [screen, setScreen] = useState<Screen>("loading");
  const [tab, setTab] = useState<Tab>("home");
  const [showRoutine, setShowRoutine] = useState(false);
  const [cookMeal, setCookMeal] = useState<{ name: string; ingredients: string[] } | null>(null);
  const [hideTabBar, setHideTabBar] = useState(false);
  const [recipesInitialTab, setRecipesInitialTab] = useState<"all" | "favorites" | "generate">("all");

  useEffect(() => {
    hydrate().then(() => {
      useFoodStore.getState().refresh();
      useRoutineStore.getState().fetch();
    });

    loadNotifPrefs().then((saved) => {
      if (saved?.enabled && saved.config) {
        scheduleMealReminders(saved.config);
      }
    });
  }, []);

  // Derive initial screen after hydration only (not on subsequent profile changes)
  useEffect(() => {
    if (isLoading) return;
    if (!profile) {
      setScreen("onboarding");
    } else {
      setScreen("main");
    }
  }, [isLoading]);

  if (screen === "loading" || isLoading) return null;

  const handleReset = async () => {
    await logout();
    setTab("home");
    setScreen("onboarding");
  };

  const defaultProfile: UserProfile = {
    gender: "other",
    age: 25,
    height: 170,
    weight: 70,
    activityLevel: "moderate",
    goal: "maintain",
  };

  if (screen === "onboarding") {
    return (
      <>
        <StatusBar style={C.statusBarStyle} />
        <Onboarding
          onComplete={(p) => {
            setProfile(p);
            setScreen("auth");
          }}
          onLogin={() => setScreen("login")}
        />
      </>
    );
  }

  if (screen === "auth" || screen === "login") {
    return (
      <>
        <StatusBar style={C.statusBarStyle} />
        <Auth
          profile={screen === "login" ? defaultProfile : (profile ?? defaultProfile)}
          onSuccess={() => {
            useFoodStore.getState().refresh();
            useRoutineStore.getState().fetch();
            setScreen("main");
          }}
          onSkip={screen === "login"
            ? () => setScreen("onboarding")
            : async () => {
                if (profile) {
                  await setProfile(profile);
                }
                setScreen("main");
              }
          }
          initialMode={screen === "login" ? "login" : "register"}
        />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <StatusBar style={C.statusBarStyle} />
      {cookMeal ? (
        <CookFromRoutine
          mealName={cookMeal.name}
          ingredients={cookMeal.ingredients}
          onBack={() => setCookMeal(null)}
        />
      ) : showRoutine ? (
        <WeeklyRoutine
          onBack={() => setShowRoutine(false)}
          onCookMeal={(name, ingredients) => { setShowRoutine(false); setCookMeal({ name, ingredients }); }}
        />
      ) : (
        <>
          {tab === "home" && (
            <Dashboard
              onNavigateToTracking={() => setTab("tracking")}
              onNavigateToRecipes={() => { setRecipesInitialTab("generate"); setTab("recettes"); }}
              onNavigateToRoutine={() => setShowRoutine(true)}
              onCookMeal={(name, ingredients) => setCookMeal({ name, ingredients })}
            />
          )}
          {tab === "tracking" && <Tracking />}
          {tab === "recettes" && (
            <Recipes
              onCookMeal={(name, ingredients) => setCookMeal({ name, ingredients })}
              onSubScreen={setHideTabBar}
              initialFilter={recipesInitialTab}
            />
          )}
          {tab === "settings" && <Settings onReset={handleReset} />}
          {!hideTabBar && <BottomTabBar activeTab={tab} onTabPress={(t) => { setTab(t); if (t !== "recettes") setRecipesInitialTab("all"); }} />}
        </>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
