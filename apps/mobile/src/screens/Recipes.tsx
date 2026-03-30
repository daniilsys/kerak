import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  ActivityIndicator,
  Easing,
  Keyboard,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Recipe } from "@kerak/types";
import {
  getSavedRecipes,
  toggleFavorite,
  deleteSavedRecipe,
  searchIngredients,
  generateRecipes,
  addFoodLog,
  getCurrentRoutine,
  getDaySummary,
  getDailyRecipes,
} from "../utils/api";
import { useTheme } from "../theme/ThemeContext";
import { useDebounce } from "../hooks/useDebounce";
import { loadRecipePrefs, saveRecipePrefs } from "../utils/storage";
import { Badge } from "../components/Badge";
import RecipeDetail from "./RecipeDetail";

const CARD_RADIUS = 20;
const INNER_RADIUS = 14;
const PILL_RADIUS = 10;
const SPACING = 8;
const SUGGESTION_CARD_WIDTH = 190;

function useStaggerFade(sectionIndex: number, duration = 400) {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, {
        toValue: 1,
        duration,
        delay: sectionIndex * 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration,
        delay: sectionIndex * 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { opacity: anim, transform: [{ translateY: slide }] };
}

function SkeletonCard({ index }: { index: number }) {
  const { C } = useTheme();
  const shimmer = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        width: SUGGESTION_CARD_WIDTH,
        height: 110,
        backgroundColor: C.card,
        borderRadius: CARD_RADIUS,
        marginRight: SPACING * 1.5,
        borderWidth: 1,
        borderColor: C.border,
        opacity: shimmer,
        padding: 16,
        justifyContent: "space-between",
      }}
    >
      <View
        style={{
          width: "75%",
          height: 14,
          borderRadius: 7,
          backgroundColor: C.border,
        }}
      />
      <View
        style={{
          width: "50%",
          height: 10,
          borderRadius: 5,
          backgroundColor: C.border,
          marginTop: 8,
        }}
      />
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <View
          style={{
            width: 50,
            height: 10,
            borderRadius: 5,
            backgroundColor: C.border,
          }}
        />
        <View
          style={{
            width: 50,
            height: 10,
            borderRadius: 5,
            backgroundColor: C.border,
          }}
        />
      </View>
    </Animated.View>
  );
}

function SuggestionCard({
  recipe,
  index,
  onPress,
}: {
  recipe: Recipe;
  index: number;
  onPress: () => void;
}) {
  const { C } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const diffLabel =
    recipe.difficulty === "easy"
      ? "Facile"
      : recipe.difficulty === "medium"
        ? "Moyen"
        : "Difficile";
  const diffColor =
    recipe.difficulty === "easy"
      ? C.primary
      : recipe.difficulty === "medium"
        ? C.amber
        : C.error;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityLabel={`Suggestion: ${recipe.name}`}
        style={({ pressed }) => ({
          width: SUGGESTION_CARD_WIDTH,
          backgroundColor: C.card,
          borderRadius: CARD_RADIUS,
          padding: 16,
          marginRight: SPACING * 1.5,
          borderWidth: 1,
          borderColor: C.border,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          justifyContent: "space-between",
          minHeight: 110,
        })}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: C.textPrimary,
            lineHeight: 20,
            marginBottom: SPACING,
          }}
          numberOfLines={2}
        >
          {recipe.name}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: SPACING,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: diffColor,
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: diffColor,
            }}
          >
            {diffLabel}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="time-outline" size={12} color={C.teal} />
            <Text style={{ fontSize: 11, color: C.teal, fontWeight: "600" }}>
              {recipe.duration} min
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="flame-outline" size={12} color={C.accent} />
            <Text style={{ fontSize: 11, color: C.accent, fontWeight: "600" }}>
              {recipe.calories} kcal
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function SavedRecipeCard({
  item,
  index,
  onPress,
  onToggleFav,
  onDelete,
}: {
  item: {
    id: string;
    recipe: Recipe;
    favorite: boolean;
    completedAt: string;
  };
  index: number;
  onPress: () => void;
  onToggleFav: () => void;
  onDelete?: () => void;
}) {
  const { C } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const recipe = item.recipe;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animateHeart = () => {
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.3,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 150,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLongPress = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -7,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -4,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 2,
        duration: 30,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 30,
        useNativeDriver: true,
      }),
    ]).start();

    const buttons: any[] = [
      { text: "Annuler", style: "cancel" },
      {
        text: item.favorite ? "Retirer des favoris" : "Ajouter aux favoris",
        onPress: () => {
          animateHeart();
          onToggleFav();
        },
      },
    ];
    if (onDelete) {
      buttons.push({
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Supprimer la recette",
            `Supprimer "${recipe.name}" de vos recettes ?`,
            [
              { text: "Annuler", style: "cancel" },
              { text: "Supprimer", style: "destructive", onPress: onDelete },
            ],
          );
        },
      });
    }
    Alert.alert(
      recipe.name,
      item.favorite ? "Recette favorite" : "Recette sauvegardée",
      buttons,
    );
  };

  const difficultyLabel =
    recipe.difficulty === "easy"
      ? "Facile"
      : recipe.difficulty === "medium"
        ? "Moyen"
        : "Difficile";
  const diffColor =
    recipe.difficulty === "easy"
      ? C.primary
      : recipe.difficulty === "medium"
        ? C.amber
        : C.error;

  const isGenerated = item.id.startsWith("gen-");
  const completedDate = new Date(item.completedAt);
  const dateStr = isGenerated
    ? null
    : completedDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      });

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: shakeAnim }, { translateY: slideAnim }],
      }}
    >
      <Pressable
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        accessibilityLabel={`Recette ${recipe.name}. Maintenir pour gérer.`}
        style={({ pressed }) => ({
          backgroundColor: C.card,
          borderRadius: CARD_RADIUS,
          padding: 16,
          borderWidth: 1,
          borderColor: C.border,
          gap: SPACING * 1.5,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <Text
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: "700",
              color: C.textPrimary,
              lineHeight: 22,
            }}
            numberOfLines={2}
          >
            {recipe.name}
          </Text>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              animateHeart();
              onToggleFav();
            }}
            hitSlop={12}
            accessibilityLabel={
              item.favorite ? "Retirer des favoris" : "Ajouter aux favoris"
            }
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Animated.View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: item.favorite
                  ? C.error + "14"
                  : C.paleOak + "14",
                transform: [{ scale: heartScale }],
              }}
            >
              <Ionicons
                name={item.favorite ? "heart" : "heart-outline"}
                size={18}
                color={item.favorite ? C.error : C.paleOak}
              />
            </Animated.View>
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING,
            flexWrap: "wrap",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: diffColor + "14",
              borderRadius: PILL_RADIUS,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: diffColor,
              }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: diffColor,
              }}
            >
              {difficultyLabel}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Ionicons name="time-outline" size={14} color={C.teal} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: C.teal,
              }}
            >
              {recipe.duration} min
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Ionicons name="flame-outline" size={14} color={C.accent} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: C.accent,
              }}
            >
              {recipe.calories} kcal
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            borderTopWidth: 1,
            borderTopColor: C.border,
            paddingTop: SPACING * 1.25,
          }}
        >
          <Text style={{ fontSize: 12, color: C.textSecondary }}>
            {dateStr ? `Cuisinée le ${dateStr}` : "Nouvelle recette"}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: C.primary,
              }}
            >
              Voir
            </Text>
            <Ionicons name="chevron-forward" size={14} color={C.primary} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyRecipes({
  favOnly,
  C,
  onGoToGenerate,
}: {
  favOnly: boolean;
  C: any;
  onGoToGenerate?: () => void;
}) {
  const fadeStyle = useStaggerFade(0, 500);

  return (
    <Animated.View style={fadeStyle}>
      <View
        style={{
          alignItems: "center",
          paddingVertical: 56,
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: CARD_RADIUS,
            backgroundColor: C.paleOak + "12",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Ionicons
            name={favOnly ? "heart-outline" : "book-outline"}
            size={36}
            color={C.paleOak}
          />
        </View>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: C.textPrimary,
            textAlign: "center",
            marginBottom: SPACING,
          }}
        >
          {favOnly ? "Aucun favori" : "Aucune recette"}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: C.textSecondary,
            textAlign: "center",
            lineHeight: 21,
          }}
        >
          {favOnly
            ? "Appuyez sur le coeur d'une recette pour l'ajouter a vos favoris"
            : "Terminez une recette en mode cuisine pour la retrouver ici"}
        </Text>
        {!favOnly && onGoToGenerate && (
          <Pressable
            onPress={onGoToGenerate}
            accessibilityLabel="Générer des recettes"
            style={({ pressed }) => ({
              marginTop: 24,
              backgroundColor: C.accent,
              borderRadius: INNER_RADIUS,
              paddingVertical: 14,
              paddingHorizontal: 28,
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Ionicons name="sparkles" size={18} color={C.white} />
            <Text style={{ fontSize: 15, fontWeight: "700", color: C.white }}>
              Générer des recettes
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const TAB_KEYS = ["all", "favorites", "generate"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_CONFIG: Record<
  TabKey,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  all: { label: "Toutes", icon: "book-outline" },
  favorites: { label: "Favoris", icon: "heart-outline" },
  generate: { label: "Générer", icon: "sparkles-outline" },
};

function TabSelector({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const { C } = useTheme();
  const indicatorX = useRef(
    new Animated.Value(TAB_KEYS.indexOf(active)),
  ).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: TAB_KEYS.indexOf(active),
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  }, [active]);

  return (
    <View
      style={{
        flexDirection: "row",
        marginHorizontal: 24,
        marginBottom: 16,
        backgroundColor: C.card,
        borderRadius: INNER_RADIUS,
        padding: 4,
        borderWidth: 1,
        borderColor: C.border,
        position: "relative",
        height: 48,
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: 4,
          width: "33%",
          transform: [
            {
              translateX: indicatorX.interpolate({
                inputRange: [0, 1, 2],
                outputRange: [0, 1, 2].map((i) => i * ((1 / 3) * 100) * 0.01),
              }),
            },
          ],
        }}
      />
      {TAB_KEYS.map((key, idx) => {
        const isActive = active === key;
        const cfg = TAB_CONFIG[key];
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityLabel={`Onglet ${cfg.label}`}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              borderRadius: PILL_RADIUS,
              backgroundColor: isActive ? C.accent : "transparent",
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Ionicons
              name={cfg.icon as any}
              size={15}
              color={isActive ? C.white : C.textSecondary}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: isActive ? C.white : C.textSecondary,
              }}
            >
              {cfg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function GenerateTab({
  genQuery,
  setGenQuery,
  genSuggestions,
  setGenSuggestions,
  genSelected,
  setGenSelected,
  genServings,
  setGenServings,
  genRecipes,
  genLoading,
  genError,
  maxKcal,
  setMaxKcal,
  difficulty,
  setDifficulty,
  onGenerate,
  onCancel,
  onRecipePress,
  dailyRecipes,
}: {
  genQuery: string;
  setGenQuery: (v: string) => void;
  genSuggestions: { id: string; name: string }[];
  setGenSuggestions: (v: { id: string; name: string }[]) => void;
  genSelected: { id: string; name: string }[];
  setGenSelected: React.Dispatch<
    React.SetStateAction<{ id: string; name: string }[]>
  >;
  genServings: number;
  setGenServings: (v: number) => void;
  genRecipes: Recipe[];
  genLoading: boolean;
  genError: string | null;
  maxKcal: string;
  setMaxKcal: (v: string) => void;
  difficulty: "easy" | "medium" | "hard" | null;
  setDifficulty: (v: "easy" | "medium" | "hard" | null) => void;
  onGenerate: () => void;
  onCancel: () => void;
  onRecipePress: (r: Recipe) => void;
  dailyRecipes: Recipe[];
}) {
  const { C } = useTheme();
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const optionsHeight = useRef(new Animated.Value(0)).current;

  const section1 = useStaggerFade(0);
  const section2 = useStaggerFade(1);
  const section3 = useStaggerFade(2);

  useEffect(() => {
    Animated.spring(optionsHeight, {
      toValue: optionsExpanded ? 1 : 0,
      useNativeDriver: false,
      tension: 300,
      friction: 30,
    }).start();
  }, [optionsExpanded]);

  return (
    <View style={{ paddingHorizontal: 24, gap: 16 }}>
      {dailyRecipes.length > 0 && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                backgroundColor: C.accent + "15",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="sparkles" size={12} color={C.accent} />
            </View>
            <Text
              style={{ fontSize: 15, fontWeight: "700", color: C.textPrimary }}
            >
              Recettes du jour
            </Text>
          </View>
          {dailyRecipes.map((recipe, i) => (
            <Pressable
              key={i}
              onPress={() => onRecipePress(recipe)}
              style={({ pressed }) => ({
                backgroundColor: C.card,
                borderRadius: CARD_RADIUS,
                padding: 14,
                borderWidth: 1,
                borderColor: C.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: C.textPrimary,
                  }}
                  numberOfLines={1}
                >
                  {recipe.name}
                </Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Ionicons name="time-outline" size={12} color={C.teal} />
                    <Text style={{ fontSize: 12, color: C.teal }}>
                      {recipe.duration} min
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Ionicons name="flame-outline" size={12} color={C.accent} />
                    <Text style={{ fontSize: 12, color: C.accent }}>
                      {recipe.calories} kcal
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={C.textSecondary}
              />
            </Pressable>
          ))}
        </View>
      )}

      <Animated.View style={section1}>
        <View style={{ gap: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: C.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "800",
                  color: C.white,
                }}
              >
                1
              </Text>
            </View>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: C.textPrimary,
              }}
            >
              Choisir les ingredients
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: C.card,
              borderRadius: INNER_RADIUS,
              paddingHorizontal: 14,
              borderWidth: 1.5,
              borderColor: genSuggestions.length > 0 ? C.accent : C.border,
            }}
          >
            <Ionicons name="search-outline" size={18} color={C.paleOak} />
            <TextInput
              style={{
                flex: 1,
                paddingVertical: 14,
                paddingHorizontal: 10,
                fontSize: 15,
                color: C.textPrimary,
              }}
              placeholder="Rechercher un ingredient..."
              placeholderTextColor={C.paleOak}
              value={genQuery}
              onChangeText={setGenQuery}
              autoCorrect={false}
              accessibilityLabel="Rechercher un ingredient"
            />
            {genQuery.length > 0 && (
              <Pressable
                onPress={() => {
                  setGenQuery("");
                  setGenSuggestions([]);
                }}
                hitSlop={8}
                accessibilityLabel="Effacer la recherche"
              >
                <Ionicons name="close-circle" size={18} color={C.paleOak} />
              </Pressable>
            )}
          </View>

          {genSuggestions.length > 0 && (
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={{
                backgroundColor: C.card,
                borderRadius: INNER_RADIUS,
                borderWidth: 1,
                borderColor: C.border,
                maxHeight: 200,
              }}
            >
              {genSuggestions.map((item, i) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setGenSelected((prev) => [...prev, item]);
                    setGenQuery("");
                    setGenSuggestions([]);
                  }}
                  accessibilityLabel={`Ajouter ${item.name}`}
                  style={({ pressed }) => ({
                    paddingVertical: 13,
                    paddingHorizontal: 16,
                    backgroundColor: pressed ? C.accent + "10" : "transparent",
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: C.border,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  })}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color={C.accent}
                  />
                  <Text
                    style={{
                      fontSize: 15,
                      color: C.textPrimary,
                    }}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {genSelected.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: SPACING,
              }}
            >
              {genSelected.map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: C.accent + "15",
                    borderRadius: CARD_RADIUS,
                    paddingLeft: 12,
                    paddingRight: 6,
                    paddingVertical: 7,
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: C.accent,
                    }}
                  >
                    {item.name}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setGenSelected((prev) =>
                        prev.filter((s) => s.id !== item.id),
                      )
                    }
                    hitSlop={6}
                    accessibilityLabel={`Retirer ${item.name}`}
                    style={({ pressed }) => ({
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: C.accent + "20",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Ionicons name="close" size={12} color={C.accent} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.View>

      <Animated.View style={section2}>
        <View style={{ gap: 0 }}>
          <Pressable
            onPress={() => setOptionsExpanded(!optionsExpanded)}
            accessibilityLabel={
              optionsExpanded ? "Masquer les options" : "Afficher les options"
            }
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: C.card,
              borderRadius: INNER_RADIUS,
              padding: 14,
              borderWidth: 1,
              borderColor: C.border,
              borderBottomLeftRadius: optionsExpanded ? 0 : INNER_RADIUS,
              borderBottomRightRadius: optionsExpanded ? 0 : INNER_RADIUS,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: C.accent + "20",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="options-outline" size={13} color={C.accent} />
              </View>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: C.textPrimary,
                }}
              >
                Options
              </Text>
            </View>
            <Ionicons
              name={optionsExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={C.textSecondary}
            />
          </Pressable>

          <Animated.View
            style={{
              maxHeight: optionsHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 300],
              }),
              overflow: "hidden",
              opacity: optionsHeight,
            }}
          >
            <View
              style={{
                backgroundColor: C.card,
                borderBottomLeftRadius: INNER_RADIUS,
                borderBottomRightRadius: INNER_RADIUS,
                padding: 14,
                gap: 14,
                borderWidth: 1,
                borderTopWidth: 0,
                borderColor: C.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name="people-outline"
                    size={17}
                    color={C.textSecondary}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: C.textPrimary,
                    }}
                  >
                    Portions
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Pressable
                    onPress={() => setGenServings(Math.max(1, genServings - 1))}
                    hitSlop={8}
                    accessibilityLabel="Diminuer les portions"
                    style={({ pressed }) => ({
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: pressed
                        ? C.paleOak + "30"
                        : C.paleOak + "15",
                      alignItems: "center",
                      justifyContent: "center",
                    })}
                  >
                    <Ionicons name="remove" size={16} color={C.textPrimary} />
                  </Pressable>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: C.textPrimary,
                      minWidth: 22,
                      textAlign: "center",
                    }}
                  >
                    {genServings}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setGenServings(Math.min(12, genServings + 1))
                    }
                    hitSlop={8}
                    accessibilityLabel="Augmenter les portions"
                    style={({ pressed }) => ({
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: pressed
                        ? C.primary + "30"
                        : C.primary + "15",
                      alignItems: "center",
                      justifyContent: "center",
                    })}
                  >
                    <Ionicons name="add" size={16} color={C.textPrimary} />
                  </Pressable>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: C.background,
                  borderRadius: PILL_RADIUS,
                  paddingHorizontal: 12,
                }}
              >
                <Ionicons name="flame-outline" size={15} color={C.accent} />
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    paddingHorizontal: 8,
                    fontSize: 14,
                    color: C.textPrimary,
                  }}
                  value={maxKcal}
                  onChangeText={(v) => {
                    setMaxKcal(v);
                    saveRecipePrefs({
                      maxCalories: v ? parseInt(v, 10) : undefined,
                      difficulty,
                    });
                  }}
                  placeholder="Max kcal / personne"
                  placeholderTextColor={C.paleOak}
                  keyboardType="number-pad"
                  accessibilityLabel="Calories maximum par personne"
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: C.textSecondary,
                    marginBottom: 2,
                  }}
                >
                  Difficulte
                </Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {(
                    [
                      { key: null, label: "Toutes" },
                      { key: "easy", label: "Facile" },
                      { key: "medium", label: "Moyen" },
                      { key: "hard", label: "Difficile" },
                    ] as const
                  ).map((d) => {
                    const isActive = difficulty === d.key;
                    return (
                      <Pressable
                        key={d.label}
                        onPress={() => {
                          const v = d.key as any;
                          setDifficulty(v);
                          saveRecipePrefs({
                            maxCalories: maxKcal
                              ? parseInt(maxKcal, 10)
                              : undefined,
                            difficulty: v,
                          });
                        }}
                        accessibilityLabel={`Difficulte ${d.label}`}
                        style={({ pressed }) => ({
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: PILL_RADIUS,
                          alignItems: "center",
                          backgroundColor: isActive ? C.accent : C.background,
                          borderWidth: 1,
                          borderColor: isActive ? C.accent : C.border,
                          opacity: pressed ? 0.9 : 1,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        })}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: isActive ? C.white : C.textSecondary,
                          }}
                        >
                          {d.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.View style={section3}>
        {genLoading ? (
          <Pressable
            onPress={onCancel}
            accessibilityLabel="Annuler la generation"
            style={({ pressed }) => ({
              backgroundColor: C.error + "12",
              borderRadius: INNER_RADIUS,
              paddingVertical: 18,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 10,
              borderWidth: 1.5,
              borderColor: C.error + "30",
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <ActivityIndicator size="small" color={C.error} />
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: C.error,
              }}
            >
              Annuler
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onGenerate}
            disabled={genSelected.length === 0}
            accessibilityLabel="Générer mes recettes"
            style={({ pressed }) => ({
              backgroundColor: C.accent,
              borderRadius: INNER_RADIUS,
              paddingVertical: 18,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 10,
              opacity: genSelected.length === 0 ? 0.4 : pressed ? 0.9 : 1,
              transform: [
                {
                  scale: pressed && genSelected.length > 0 ? 0.98 : 1,
                },
              ],
            })}
          >
            <Ionicons name="sparkles" size={18} color={C.white} />
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: C.white,
              }}
            >
              Générer mes recettes
            </Text>
          </Pressable>
        )}
      </Animated.View>

      {genError && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: C.error + "10",
            borderRadius: INNER_RADIUS,
            padding: 16,
            borderWidth: 1,
            borderColor: C.error + "20",
          }}
        >
          <Ionicons name="alert-circle" size={20} color={C.error} />
          <Text style={{ flex: 1, fontSize: 14, color: C.error }}>
            {genError}
          </Text>
        </View>
      )}

      {genRecipes.length > 0 && (
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color={C.success} />
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: C.textPrimary,
              }}
            >
              {genRecipes.length} recette
              {genRecipes.length > 1 ? "s" : ""} trouvée
              {genRecipes.length > 1 ? "s" : ""}
            </Text>
          </View>
          {genRecipes.map((recipe, i) => (
            <SavedRecipeCard
              key={i}
              item={{
                id: `gen-${i}`,
                recipe,
                favorite: false,
                completedAt: new Date().toISOString(),
              }}
              index={i}
              onPress={() => onRecipePress(recipe)}
              onToggleFav={() => {}}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface RecipesProps {
  onCookMeal?: (name: string, ingredients: string[]) => void;
  onSubScreen?: (visible: boolean) => void;
  initialFilter?: "all" | "favorites" | "generate";
  onFilterConsumed?: () => void;
}

export default function Recipes({
  onCookMeal,
  onSubScreen,
  initialFilter,
  onFilterConsumed,
}: RecipesProps) {
  const { C } = useTheme();
  const [filter, setFilter] = useState<"all" | "favorites" | "generate">(
    initialFilter ?? "all",
  );
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (initialFilter && initialFilter !== "all") {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  const [routineMeal, setRoutineMeal] = useState<{
    name: string;
    calories: number;
    mealLabel: string;
    ingredients: string[];
  } | null>(null);

  const [genQuery, setGenQuery] = useState("");
  const [genSuggestions, setGenSuggestions] = useState<
    { id: string; name: string }[]
  >([]);
  const [genSelected, setGenSelected] = useState<
    { id: string; name: string }[]
  >([]);
  const [genServings, setGenServings] = useState(1);
  const [genRecipes, setGenRecipes] = useState<Recipe[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [maxKcal, setMaxKcal] = useState("");
  const [difficulty, setDifficulty] = useState<
    "easy" | "medium" | "hard" | null
  >(null);
  const [dailyRecipes, setDailyRecipes] = useState<Recipe[]>([]);
  const debouncedGenQuery = useDebounce(genQuery, 300);

  const headerFade = useStaggerFade(0);
  const routineFade = useStaggerFade(1);
  const suggestionsFade = useStaggerFade(2);
  const tabsFade = useStaggerFade(3);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSavedRecipes(filter === "favorites");
      setRecipes(data.recipes || []);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  useEffect(() => {
    Promise.all([
      getCurrentRoutine(),
      (() => {
        const now = new Date();
        const d =
          now.getHours() < 5
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
            : now;
        return getDaySummary(d.toISOString().slice(0, 10));
      })(),
    ])
      .then(([r, summary]) => {
        if (!r?.plan) return;
        const todayKeys = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        const todayKey = todayKeys[new Date().getDay()];
        const dayPlan = r.plan[todayKey];
        if (!dayPlan) return;
        const h = new Date().getHours();
        let mealKey = "dinner",
          mealLabel = "dîner";
        if (h < 10) {
          mealKey = "breakfast";
          mealLabel = "petit-déjeuner";
        } else if (h < 15) {
          mealKey = "lunch";
          mealLabel = "déjeuner";
        }
        if ((summary.byMeal[mealKey] ?? 0) > 0) return;
        const meal = dayPlan[mealKey];
        if (meal) {
          setRoutineMeal({
            name: meal.name,
            calories: meal.calories,
            mealLabel,
            ingredients: Array.isArray(meal.ingredients)
              ? meal.ingredients
              : [],
          });
        }
      })
      .catch(() => {});

    getDailyRecipes()
      .then((d) => setDailyRecipes(d.recipes || []))
      .catch(() => {});

    loadRecipePrefs().then((p) => {
      if (p) {
        if (p.maxCalories) setMaxKcal(p.maxCalories.toString());
        if (p.difficulty) setDifficulty(p.difficulty);
      }
    });
  }, []);

  useEffect(() => {
    if (debouncedGenQuery.length < 2) {
      setGenSuggestions([]);
      return;
    }
    let cancelled = false;
    searchIngredients(debouncedGenQuery).then((results) => {
      if (cancelled) return;
      const selectedIds = new Set(genSelected.map((s) => s.id));
      setGenSuggestions(results.filter((r) => !selectedIds.has(r.id)));
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedGenQuery, genSelected]);

  const genCancelledRef = useRef(false);

  const handleGenerate = async () => {
    if (genSelected.length === 0) return;
    Keyboard.dismiss();
    genCancelledRef.current = false;
    setGenLoading(true);
    setGenError(null);
    setGenRecipes([]);
    try {
      const data = await generateRecipes(
        genSelected.map((s) => s.name),
        genServings,
        {
          maxCalories: maxKcal ? parseInt(maxKcal, 10) : undefined,
          difficulty,
        },
      );
      if (!genCancelledRef.current) setGenRecipes(data.recipes);
    } catch {
      if (!genCancelledRef.current)
        setGenError("Impossible de générer. Réessayez.");
    } finally {
      if (!genCancelledRef.current) setGenLoading(false);
    }
  };

  const handleCancelGenerate = () => {
    genCancelledRef.current = true;
    setGenLoading(false);
  };

  const handleToggleFav = async (id: string) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)),
    );
    try {
      await toggleFavorite(id);
    } catch {
      fetchRecipes();
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    try {
      await deleteSavedRecipe(id);
    } catch {
      fetchRecipes();
    }
  };

  useEffect(() => {
    onSubScreen?.(!!activeRecipe);
  }, [activeRecipe]);

  if (activeRecipe) {
    return (
      <RecipeDetail
        recipe={activeRecipe}
        onBack={() => {
          setActiveRecipe(null);
          fetchRecipes();
        }}
        onLogRecipe={(calories) => {
          const now = new Date();
          const date =
            now.getHours() < 5
              ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
              : now;
          const dateStr = date.toISOString().slice(0, 10);
          const h = now.getHours();
          const meal =
            h < 5
              ? "dinner"
              : h < 11
                ? "breakfast"
                : h < 15
                  ? "lunch"
                  : h < 18
                    ? "snack"
                    : "dinner";
          addFoodLog({
            date: dateStr,
            meal,
            label: activeRecipe.name,
            calories,
          }).catch(() => {});
          setActiveRecipe(null);
        }}
      />
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: C.background }}
      edges={["top"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            {
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: 12,
            },
            headerFade,
          ]}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: C.textPrimary,
              letterSpacing: -0.5,
            }}
          >
            Mes recettes
          </Text>
        </Animated.View>

        {routineMeal && onCookMeal && (
          <Animated.View style={routineFade}>
            <Pressable
              onPress={() =>
                onCookMeal(routineMeal.name, routineMeal.ingredients)
              }
              accessibilityLabel={`Cuisiner ${routineMeal.name}`}
              style={({ pressed }) => ({
                marginHorizontal: 24,
                marginBottom: 16,
                backgroundColor: C.accent + "10",
                borderRadius: CARD_RADIUS,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                borderWidth: 1,
                borderColor: C.accent + "20",
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: INNER_RADIUS,
                  backgroundColor: C.accent + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="restaurant" size={22} color={C.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: C.accent,
                    fontWeight: "600",
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                  }}
                >
                  C'est l'heure du {routineMeal.mealLabel}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: C.textPrimary,
                  }}
                  numberOfLines={1}
                >
                  {routineMeal.name}
                </Text>
              </View>
              <View style={{ alignItems: "center", gap: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: C.accent,
                  }}
                >
                  {routineMeal.calories}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: C.textSecondary,
                    fontWeight: "500",
                  }}
                >
                  kcal
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.accent} />
            </Pressable>
          </Animated.View>
        )}

        <Animated.View style={[{ marginBottom: 12 }, tabsFade]}>
          <TabSelector active={filter} onChange={setFilter} />
        </Animated.View>

        {filter === "generate" ? (
          <GenerateTab
            genQuery={genQuery}
            setGenQuery={setGenQuery}
            genSuggestions={genSuggestions}
            setGenSuggestions={setGenSuggestions}
            genSelected={genSelected}
            setGenSelected={setGenSelected}
            genServings={genServings}
            setGenServings={setGenServings}
            genRecipes={genRecipes}
            genLoading={genLoading}
            genError={genError}
            maxKcal={maxKcal}
            setMaxKcal={setMaxKcal}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            onGenerate={handleGenerate}
            onCancel={handleCancelGenerate}
            onRecipePress={setActiveRecipe}
            dailyRecipes={dailyRecipes}
          />
        ) : loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        ) : recipes.length === 0 ? (
          <EmptyRecipes
            favOnly={filter === "favorites"}
            C={C}
            onGoToGenerate={() => setFilter("generate")}
          />
        ) : (
          <View style={{ paddingHorizontal: 24, gap: 12 }}>
            {recipes.map((item: any, i: number) => (
              <SavedRecipeCard
                key={item.id}
                item={item}
                index={i}
                onPress={() => setActiveRecipe(item.recipe)}
                onToggleFav={() => handleToggleFav(item.id)}
                onDelete={() => handleDeleteRecipe(item.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
