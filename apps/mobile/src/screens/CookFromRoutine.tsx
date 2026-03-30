import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Easing, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Recipe } from "@kerak/types";
import { generateRecipes, addFoodLog } from "../utils/api";
import { useTheme } from "../theme/ThemeContext";
import RecipeDetail from "./RecipeDetail";

const TIPS = [
  "Le sel fait ressortir la saveur naturelle des aliments",
  "Laissez reposer la viande 5 min après cuisson",
  "Un filet de citron peut transformer n'importe quel plat",
  "Préchauffez toujours votre poêle avant d'y poser un aliment",
  "L'ail brûle en 30 secondes — ajoutez-le en dernier",
  "Les herbes fraîches s'ajoutent en fin de cuisson",
  "L'eau des pâtes est un liant magique pour les sauces",
  "Les épices entières libèrent plus d'arômes si vous les toastez à sec",
];

interface Props {
  mealName: string;
  ingredients: string[];
  onBack: () => void;
}

export default function CookFromRoutine({ mealName, ingredients, onBack }: Props) {
  const { C } = useTheme();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const spin = useRef(new Animated.Value(0)).current;
  const tipOpacity = useRef(new Animated.Value(1)).current;
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true }),
    ).start();

    const interval = setInterval(() => {
      Animated.timing(tipOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setTipIndex((i) => (i + 1) % TIPS.length);
        Animated.timing(tipOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 4000);

    const ingList = ingredients.length > 0
      ? ingredients.map((i) => i.replace(/\d+[gml\s]*/i, "").trim()).filter(Boolean)
      : [mealName];

    let isCancelled = false;

    generateRecipes(ingList, 1, { maxCalories: undefined, difficulty: null })
      .then((data) => {
        if (isCancelled) return;
        const match = data.recipes.find((r) =>
          r.name.toLowerCase().includes(mealName.toLowerCase().split(" ")[0]),
        ) ?? data.recipes[0];
        if (match) setRecipe(match);
        else setError(true);
      })
      .catch(() => { if (!isCancelled) setError(true); });

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (cancelled) return null;

  if (recipe) {
    return (
      <RecipeDetail
        recipe={recipe}
        onBack={onBack}
        onLogRecipe={(calories) => {
          const now = new Date();
          const date = now.getHours() < 5
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
            : now;
          const dateStr = date.toISOString().slice(0, 10);
          const h = now.getHours();
          const meal = h < 5 ? "dinner" : h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 18 ? "snack" : "dinner";
          addFoodLog({ date: dateStr, meal, label: recipe.name, calories }).catch(() => {});
          onBack();
        }}
      />
    );
  }

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={["top"]}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        {error ? (
          <>
            <View
              style={{
                width: 72, height: 72, borderRadius: 24,
                backgroundColor: C.error + "15",
                alignItems: "center", justifyContent: "center", marginBottom: 20,
              }}
            >
              <Ionicons name="alert-circle-outline" size={36} color={C.error} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: C.textPrimary, textAlign: "center", marginBottom: 8 }}>
              Impossible de générer
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: "center", marginBottom: 24 }}>
              La recette n'a pas pu être créée. Vérifiez votre connexion.
            </Text>
            <Pressable
              onPress={onBack}
              style={({ pressed }) => ({
                backgroundColor: C.accent,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 28,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: C.white }}>Retour</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Animated.View style={{ transform: [{ rotate: rotation }], marginBottom: 28 }}>
              <Ionicons name="restaurant" size={48} color={C.accent} />
            </Animated.View>

            <Text style={{ fontSize: 20, fontWeight: "700", color: C.textPrimary, textAlign: "center", marginBottom: 6 }}>
              {mealName}
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: "center", marginBottom: 28 }}>
              Préparation de votre recette...
            </Text>

            <ActivityIndicator color={C.accent} style={{ marginBottom: 32 }} />

            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 16,
                padding: 20,
                borderLeftWidth: 4,
                borderLeftColor: C.accent,
                width: "100%",
                marginBottom: 32,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: C.accent, letterSpacing: 1, marginBottom: 6 }}>
                LE SAVIEZ-VOUS ?
              </Text>
              <Animated.View style={{ opacity: tipOpacity }}>
                <Text style={{ fontSize: 14, lineHeight: 21, color: C.textSecondary }}>
                  {TIPS[tipIndex]}
                </Text>
              </Animated.View>
            </View>

            <Pressable
              onPress={() => { setCancelled(true); onBack(); }}
              style={({ pressed }) => ({
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 12,
                backgroundColor: C.error + "12",
                borderWidth: 1,
                borderColor: C.error + "25",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: C.error }}>
                Annuler
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
