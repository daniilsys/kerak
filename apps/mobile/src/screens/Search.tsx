import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  ActivityIndicator,
  Keyboard,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Recipe } from "@kerak/types";
import {
  searchIngredients,
  generateRecipes,
  getDailyRecipes,
  getDaySummary,
  addFoodLog,
} from "../utils/api";
import RecipeDetail from "./RecipeDetail";
import { useTheme } from "../theme/ThemeContext";
import { useFadeIn } from "../hooks/useAnimations";
import { useDebounce } from "../hooks/useDebounce";
import { loadRecipePrefs, saveRecipePrefs } from "../utils/storage";
import { Badge } from "../components/Badge";
import { IconButton } from "../components/IconButton";

function trackingDate(): string {
  const now = new Date();
  if (now.getHours() < 5) now.setDate(now.getDate() - 1);
  return now.toISOString().slice(0, 10);
}

function getMealByHour(): string {
  const h = new Date().getHours();
  if (h < 5) return "dinner";
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 18) return "snack";
  return "dinner";
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

const COOKING_TIPS = [
  "Le sel fait ressortir la saveur naturelle des aliments",
  "Laissez reposer la viande 5 min après cuisson pour garder le jus",
  "Coupez les légumes en tailles égales pour une cuisson uniforme",
  "Un filet de citron peut transformer n'importe quel plat",
  "Préchauffez toujours votre poêle avant d'y poser un aliment",
  "L'ail brûle en 30 secondes — ajoutez-le en dernier",
  "Goûtez et assaisonnez à chaque étape, pas seulement à la fin",
  "Les herbes fraîches s'ajoutent en fin de cuisson",
  "Un bon couteau bien aiguisé est plus sûr qu'un couteau émoussé",
  "L'eau des pâtes est un liant magique pour les sauces",
  "Déglacez votre poêle avec du vin ou du bouillon pour récupérer les sucs",
  "Les épices entières libèrent plus d'arômes si vous les toastez à sec",
];

function LoadingOverlay() {
  const { C } = useTheme();
  const [tipIndex, setTipIndex] = useState(
    () => Math.floor(Math.random() * COOKING_TIPS.length),
  );
  const tipOpacity = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    ).start();

    const interval = setInterval(() => {
      Animated.timing(tipOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setTipIndex((i) => (i + 1) % COOKING_TIPS.length);
        Animated.timing(tipOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: C.secondaryBg + "F5",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        paddingHorizontal: 40,
      }}
    >
      <Animated.View style={{ transform: [{ rotate: rotation }], marginBottom: 28 }}>
        <Ionicons name="restaurant" size={48} color={C.accent} />
      </Animated.View>

      <Text style={{ fontSize: 20, fontWeight: "700", color: C.primaryDark, marginBottom: 8 }}>
        On prépare vos recettes...
      </Text>

      <ActivityIndicator size="small" color={C.accent} style={{ marginBottom: 28 }} />

      <View
        style={{
          backgroundColor: C.white,
          borderRadius: 16,
          padding: 20,
          borderLeftWidth: 4,
          borderLeftColor: C.accent,
          width: "100%",
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: "700", color: C.accent, letterSpacing: 1, marginBottom: 6 }}>
          LE SAVIEZ-VOUS ?
        </Text>
        <Animated.View style={{ opacity: tipOpacity }}>
          <Text style={{ fontSize: 15, lineHeight: 22, color: C.greyOlive }}>
            {COOKING_TIPS[tipIndex]}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const BAR_H = 4;

function CalorieBanner({
  total,
  target,
  onPress,
}: {
  total: number;
  target: number;
  onPress: () => void;
}) {
  const { C } = useTheme();
  const pct = target > 0 ? Math.min(total / target, 1) : 0;
  const remaining = Math.max(target - total, 0);
  const color = total <= target ? C.primary : C.accent;

  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct * 100,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: C.white,
        borderRadius: 14,
        padding: 14,
        gap: 12,
        borderWidth: 1,
        borderColor: C.paleOak + "18",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: color + "14",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="flame" size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: C.primaryDark }}>
            {total} <Text style={{ fontSize: 12, fontWeight: "500", color: C.paleOak }}>/ {target} kcal</Text>
          </Text>
          <Text style={{ fontSize: 12, fontWeight: "500", color }}>
            {total > target ? `+${total - target}` : `${remaining} restantes`}
          </Text>
        </View>
        <View style={{ height: BAR_H, borderRadius: BAR_H / 2, backgroundColor: C.paleOak + "18" }}>
          <Animated.View
            style={{
              height: BAR_H,
              borderRadius: BAR_H / 2,
              backgroundColor: color,
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            }}
          />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.paleOak} />
    </Pressable>
  );
}

function DailyCard({
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
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const difficultyColor =
    recipe.difficulty === "easy"
      ? C.primary
      : recipe.difficulty === "medium"
        ? C.amber
        : C.error;

  const difficultyLabel =
    recipe.difficulty === "easy"
      ? "Facile"
      : recipe.difficulty === "medium"
        ? "Moyen"
        : "Difficile";

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          width: 260,
          backgroundColor: C.white,
          borderRadius: 20,
          padding: 18,
          marginRight: 14,
          borderWidth: 1,
          borderColor: C.paleOak + "20",
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          shadowColor: C.primaryDark,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        })}
      >
        <View
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: difficultyColor + "12",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: difficultyColor,
            }}
          />
          <Text style={{ fontSize: 12, fontWeight: "600", color: difficultyColor }}>
            {difficultyLabel}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: C.primaryDark,
            lineHeight: 22,
            marginBottom: 14,
          }}
          numberOfLines={2}
        >
          {recipe.name}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            borderTopWidth: 1,
            borderTopColor: C.paleOak + "12",
            paddingTop: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name="time-outline" size={14} color={C.teal} />
            <Text style={{ fontSize: 13, fontWeight: "500", color: C.teal }}>
              {recipe.duration} min
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name="flame-outline" size={14} color={C.accent} />
            <Text style={{ fontSize: 13, fontWeight: "500", color: C.accent }}>
              {recipe.calories} kcal
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function DailySkeletons() {
  const { C } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingLeft: 24, paddingRight: 10 }}
    >
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{
            width: 260,
            height: 160,
            backgroundColor: C.white,
            borderRadius: 20,
            marginRight: 14,
            opacity,
          }}
        />
      ))}
    </ScrollView>
  );
}

function IngredientTag({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => void;
}) {
  const { C } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: C.white,
        borderRadius: 20,
        paddingLeft: 14,
        paddingRight: 8,
        paddingVertical: 8,
        gap: 6,
        borderWidth: 1.5,
        borderColor: C.accent,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "600", color: C.primaryDark }}>
        {name}
      </Text>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={({ pressed }) => ({
          opacity: pressed ? 0.5 : 1,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: C.accent + "20",
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        <Ionicons name="close" size={13} color={C.accent} />
      </Pressable>
    </View>
  );
}

function ServingsSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const { C } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: C.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: C.paleOak + "30",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Ionicons name="people-outline" size={20} color={C.greyOlive} />
        <Text style={{ fontSize: 16, fontWeight: "500", color: C.primaryDark }}>
          Portions
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Pressable
          onPress={() => onChange(Math.max(1, value - 1))}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: pressed ? C.paleOak + "30" : C.paleOak + "18",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Ionicons name="remove" size={18} color={C.primaryDark} />
        </Pressable>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: C.primaryDark,
            minWidth: 24,
            textAlign: "center",
          }}
        >
          {value}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(12, value + 1))}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: pressed ? C.primary + "30" : C.primary + "18",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Ionicons name="add" size={18} color={C.primaryDark} />
        </Pressable>
      </View>
    </View>
  );
}

function RecipeCard({
  recipe,
  onPress,
}: {
  recipe: Recipe;
  onPress: () => void;
}) {
  const { C } = useTheme();
  const difficultyLabel =
    recipe.difficulty === "easy"
      ? "Facile"
      : recipe.difficulty === "medium"
        ? "Moyen"
        : "Difficile";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: C.white,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: C.paleOak + "30",
        gap: 12,
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Text style={{ fontSize: 18, fontWeight: "700", color: C.primaryDark }}>
        {recipe.name}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Badge icon="time-outline" label={`${recipe.duration} min`} color={C.teal} />
        <Badge icon="flame-outline" label={`${recipe.calories} kcal`} color={C.accent} />
        <Badge
          icon="speedometer-outline"
          label={difficultyLabel}
          color={recipe.difficulty === "easy" ? C.primary : recipe.difficulty === "medium" ? C.amber : C.error}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          borderTopWidth: 1,
          borderTopColor: C.paleOak + "15",
          paddingTop: 12,
        }}
      >
        <Text style={{ fontSize: 13, color: C.paleOak }}>
          {recipe.ingredients.length} ingrédients · {recipe.steps.length} étapes
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.primary }}>Voir</Text>
          <Ionicons name="chevron-forward" size={16} color={C.primary} />
        </View>
      </View>
    </Pressable>
  );
}

interface Props {
  onNavigateToTracking: () => void;
  scrollToGenerate?: boolean;
  onScrollToGenerateDone?: () => void;
}

export default function Search({ onNavigateToTracking, scrollToGenerate, onScrollToGenerateDone }: Props) {
  const { C } = useTheme();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string }[]>([]);
  const [servings, setServings] = useState(2);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [maxKcal, setMaxKcal] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | null>(null);

  const [dailyRecipes, setDailyRecipes] = useState<Recipe[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);

  const [calorieTotal, setCalorieTotal] = useState(0);
  const [calorieTarget, setCalorieTarget] = useState(2000);

  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const resultsAnchorY = useRef(0);
  const generateBtnY = useRef(0);
  const header = useFadeIn(0, 400);
  const dailySection = useFadeIn(200, 400);

  useEffect(() => {
    if (scrollToGenerate && generateBtnY.current > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: generateBtnY.current - 20, animated: true });
        onScrollToGenerateDone?.();
      }, 300);
    }
  }, [scrollToGenerate]);

  useEffect(() => {
    getDailyRecipes()
      .then((data) => setDailyRecipes(data.recipes || []))
      .catch(() => {})
      .finally(() => setDailyLoading(false));

    getDaySummary(trackingDate())
      .then((s) => {
        setCalorieTotal(s.total);
        setCalorieTarget(s.target);
      })
      .catch(() => {});

    loadRecipePrefs().then((p) => {
      if (p) {
        if (p.maxCalories) setMaxKcal(p.maxCalories.toString());
        if (p.difficulty) setDifficulty(p.difficulty);
      }
    });
  }, []);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    searchIngredients(debouncedQuery).then((results) => {
      if (cancelled) return;
      const selectedIds = new Set(selected.map((s) => s.id));
      setSuggestions(results.filter((r) => !selectedIds.has(r.id)));
    });
    return () => { cancelled = true; };
  }, [debouncedQuery, selected]);

  const updatePrefs = (kcal: string, diff: "easy" | "medium" | "hard" | null) => {
    saveRecipePrefs({
      maxCalories: kcal ? parseInt(kcal, 10) || undefined : undefined,
      difficulty: diff,
    });
  };

  const addIngredient = useCallback(
    (item: { id: string; name: string }) => {
      setSelected((prev) => [...prev, item]);
      setQuery("");
      setSuggestions([]);
    },
    [],
  );

  const removeIngredient = useCallback((id: string) => {
    setSelected((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleGenerate = async () => {
    if (selected.length === 0) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setRecipes([]);
    try {
      const data = await generateRecipes(
        selected.map((s) => s.name),
        servings,
        {
          maxCalories: maxKcal ? parseInt(maxKcal, 10) : undefined,
          difficulty: difficulty,
        },
      );
      setRecipes(data.recipes);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: resultsAnchorY.current, animated: true });
      }, 150);
    } catch {
      setError("Impossible de générer les recettes. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const showSuggestions = suggestions.length > 0 && query.length >= 2;

  if (activeRecipe) {
    return (
      <RecipeDetail
        recipe={activeRecipe}
        onBack={() => setActiveRecipe(null)}
        onLogRecipe={(calories) => {
          const recipeName = activeRecipe.name;
          setActiveRecipe(null);
          onNavigateToTracking();
          addFoodLog({
            date: trackingDate(),
            meal: getMealByHour(),
            label: recipeName,
            calories,
          }).catch(() => {});
        }}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        <Animated.View style={[{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20, gap: 14 }, header]}>
          <View>
            <Text style={{ fontSize: 15, color: C.greyOlive, marginBottom: 2 }}>
              {getGreeting()} !
            </Text>
            <Text style={{ fontSize: 28, fontWeight: "800", color: C.primaryDark }}>
              Kerak
            </Text>
          </View>

          <CalorieBanner
            total={calorieTotal}
            target={calorieTarget}
            onPress={onNavigateToTracking}
          />
        </Animated.View>

        <Animated.View style={[{ marginBottom: 24 }, dailySection]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 24,
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: C.accent + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="sparkles" size={15} color={C.accent} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: C.primaryDark }}>
                Recettes du jour
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: C.paleOak }}>
              Renouvelées chaque jour
            </Text>
          </View>

          {dailyLoading ? (
            <DailySkeletons />
          ) : dailyRecipes.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 24, paddingRight: 10 }}
            >
              {dailyRecipes.map((recipe, i) => (
                <DailyCard
                  key={i}
                  recipe={recipe}
                  index={i}
                  onPress={() => setActiveRecipe(recipe)}
                />
              ))}
            </ScrollView>
          ) : (
            <View
              style={{
                marginHorizontal: 24,
                backgroundColor: C.white,
                borderRadius: 16,
                padding: 24,
                alignItems: "center",
                borderWidth: 1,
                borderColor: C.paleOak + "20",
              }}
            >
              <Ionicons name="cafe-outline" size={28} color={C.paleOak} />
              <Text style={{ fontSize: 14, color: C.paleOak, marginTop: 8, textAlign: "center" }}>
                Les recettes du jour arrivent bientôt...
              </Text>
            </View>
          )}
        </Animated.View>

        <View
          onLayout={(e) => { generateBtnY.current = e.nativeEvent.layout.y; }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 24,
            marginBottom: 16,
            gap: 12,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: C.paleOak + "25" }} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.paleOak }}>
            ou créez les vôtres
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: C.paleOak + "25" }} />
        </View>

        <View style={{ paddingHorizontal: 24, gap: 16 }}>
          <View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: C.white,
                borderRadius: 16,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: showSuggestions ? C.primary : C.paleOak + "30",
              }}
            >
              <Ionicons name="search-outline" size={20} color={C.paleOak} />
              <TextInput
                ref={inputRef}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 10,
                  fontSize: 16,
                  color: C.primaryDark,
                }}
                placeholder="Rechercher un ingrédient..."
                placeholderTextColor={C.paleOak}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => { setQuery(""); setSuggestions([]); }}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1 })}
                >
                  <Ionicons name="close-circle" size={20} color={C.paleOak} />
                </Pressable>
              )}
            </View>

            {showSuggestions && (
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                style={{
                  backgroundColor: C.white,
                  borderRadius: 12,
                  marginTop: 6,
                  borderWidth: 1,
                  borderColor: C.paleOak + "30",
                  maxHeight: 220,
                }}
              >
                {suggestions.map((item, i) => (
                  <Pressable
                    key={item.id}
                    onPress={() => addIngredient(item)}
                    style={({ pressed }) => ({
                      paddingVertical: 13,
                      paddingHorizontal: 16,
                      backgroundColor: pressed ? C.primary + "10" : "transparent",
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: C.paleOak + "15",
                    })}
                  >
                    <Text style={{ fontSize: 15, color: C.primaryDark }}>{item.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {selected.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {selected.map((item) => (
                <IngredientTag
                  key={item.id}
                  name={item.name}
                  onRemove={() => removeIngredient(item.id)}
                />
              ))}
            </View>
          )}

          <ServingsSelector value={servings} onChange={setServings} />

          <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: C.textSecondary }}>
              Préférences
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.background, borderRadius: 10, paddingHorizontal: 12 }}>
              <Ionicons name="flame-outline" size={16} color={C.accent} />
              <TextInput
                style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15, color: C.textPrimary }}
                value={maxKcal}
                onChangeText={(v) => { setMaxKcal(v); updatePrefs(v, difficulty); }}
                placeholder="Max kcal / personne"
                placeholderTextColor={C.paleOak}
                keyboardType="number-pad"
              />
              {maxKcal !== "" && (
                <Pressable onPress={() => { setMaxKcal(""); updatePrefs("", difficulty); }} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={C.paleOak} />
                </Pressable>
              )}
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              {([ { key: null, label: "Toutes" }, { key: "easy", label: "Facile" }, { key: "medium", label: "Moyen" }, { key: "hard", label: "Difficile" }] as const).map((d) => (
                <Pressable
                  key={d.label}
                  onPress={() => { setDifficulty(d.key as any); updatePrefs(maxKcal, d.key as any); }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: difficulty === d.key ? C.accent : C.background,
                    borderWidth: 1,
                    borderColor: difficulty === d.key ? C.accent : C.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: difficulty === d.key ? C.white : C.textSecondary }}>
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            onPress={handleGenerate}
            disabled={selected.length === 0 || loading}
            style={({ pressed }) => ({
              backgroundColor: C.accent,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 10,
              opacity: selected.length === 0 ? 0.4 : pressed ? 0.85 : 1,
              transform: [{ scale: pressed && selected.length > 0 ? 0.97 : 1 }],
            })}
          >
            {loading ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <Ionicons name="sparkles" size={20} color={C.white} />
            )}
            <Text style={{ fontSize: 18, fontWeight: "600", color: C.white }}>
              {loading ? "Génération..." : "Générer les recettes"}
            </Text>
          </Pressable>

          {error && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: C.error + "12",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <Ionicons name="alert-circle" size={18} color={C.error} />
              <Text style={{ flex: 1, fontSize: 14, color: C.error }}>{error}</Text>
            </View>
          )}

        </View>

        <View
          onLayout={(e) => { resultsAnchorY.current = e.nativeEvent.layout.y; }}
          style={{ paddingHorizontal: 24 }}
        >
          {recipes.length > 0 && (
            <View style={{ gap: 14, marginTop: 8 }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: C.primaryDark }}>
                {recipes.length} recettes trouvées
              </Text>
              {recipes.map((recipe, i) => (
                <RecipeCard key={i} recipe={recipe} onPress={() => setActiveRecipe(recipe)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      {loading && <LoadingOverlay />}
    </SafeAreaView>
  );
}
