import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Animated } from "react-native";
import CookingMode from "./CookingMode";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Recipe } from "@kerak/types";
import { useTheme } from "../theme/ThemeContext";
import { useFadeIn } from "../hooks/useAnimations";
import { Badge } from "../components/Badge";
import { IconButton } from "../components/IconButton";

function StepCard({
  stepNumber,
  title,
  description,
  duration,
  tip,
  index,
}: {
  stepNumber: number;
  title: string;
  description: string;
  duration?: number;
  tip?: string | null;
  index: number;
}) {
  const { C } = useTheme();
  const anim = useFadeIn(index * 60, 300);

  return (
    <Animated.View style={anim}>
      <View
        style={{
          backgroundColor: C.white,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: C.paleOak + "20",
          gap: 10,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: C.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "800", color: C.white }}>
              {stepNumber}
            </Text>
          </View>
          <Text
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: "700",
              color: C.primaryDark,
            }}
          >
            {title}
          </Text>
          {duration != null && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="time-outline" size={14} color={C.paleOak} />
              <Text style={{ fontSize: 12, color: C.paleOak, fontWeight: "500" }}>
                {duration} min
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text style={{ fontSize: 15, lineHeight: 23, color: C.greyOlive }}>
          {description}
        </Text>

        {/* Tip */}
        {tip && (
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              backgroundColor: C.primary + "10",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Ionicons name="bulb-outline" size={16} color={C.primary} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 13, lineHeight: 20, color: C.primaryDark }}>
              {tip}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

interface Props {
  recipe: Recipe;
  onBack: () => void;
  onLogRecipe?: (calories: number) => void;
}

export default function RecipeDetail({ recipe, onBack, onLogRecipe }: Props) {
  const { C } = useTheme();
  const [cooking, setCooking] = useState(false);
  const header = useFadeIn(0, 400);
  const ingredientsAnim = useFadeIn(150, 350);

  const difficultyLabel =
    recipe.difficulty === "easy"
      ? "Facile"
      : recipe.difficulty === "medium"
        ? "Moyen"
        : "Difficile";

  if (cooking) {
    return (
      <CookingMode
        recipe={recipe}
        onFinish={() => setCooking(false)}
        onLogRecipe={onLogRecipe}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.secondaryBg }}>
      {/* Top bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <IconButton icon="arrow-back" onPress={onBack} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title + badges */}
        <Animated.View style={[{ gap: 14, marginBottom: 24 }, header]}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: C.primaryDark, lineHeight: 32 }}>
            {recipe.name}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Badge icon="time-outline" label={`${recipe.duration} min`} color={C.teal} />
            <Badge icon="flame-outline" label={`${recipe.calories} kcal`} color={C.accent} />
            <Badge icon="speedometer-outline" label={difficultyLabel} color={recipe.difficulty === "easy" ? C.primary : recipe.difficulty === "medium" ? C.amber : C.error} />
          </View>
        </Animated.View>

        {/* Ingredients */}
        <Animated.View style={[{ marginBottom: 28 }, ingredientsAnim]}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: C.primaryDark,
              marginBottom: 12,
            }}
          >
            Ingrédients
          </Text>
          <View
            style={{
              backgroundColor: C.white,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.paleOak + "20",
              overflow: "hidden",
            }}
          >
            {recipe.ingredients.map((ing, i) => {
              const name = typeof ing === "string" ? ing : ing.name;
              const qty = typeof ing === "string" ? null : ing.quantity;
              return (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 13,
                    paddingHorizontal: 16,
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: C.paleOak + "12",
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: C.primary,
                      marginRight: 12,
                    }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: C.primaryDark,
                    }}
                  >
                    {name}
                  </Text>
                  {qty && (
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: C.accent,
                      }}
                    >
                      {qty}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Steps */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: C.primaryDark,
            marginBottom: 12,
          }}
        >
          Préparation
        </Text>
        <View style={{ gap: 12 }}>
          {recipe.steps.map((step, i) => (
            <StepCard
              key={step.stepNumber}
              stepNumber={step.stepNumber}
              title={step.title ?? `Étape ${step.stepNumber}`}
              description={step.description}
              duration={step.duration}
              tip={step.tip}
              index={i}
            />
          ))}
        </View>

        {/* Start cooking button */}
        <Pressable
          onPress={() => setCooking(true)}
          style={({ pressed }) => ({
            marginTop: 24,
            backgroundColor: C.accent,
            borderRadius: 16,
            paddingVertical: 18,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Ionicons name="play" size={20} color={C.white} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.white }}>
            Commencer la recette
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
