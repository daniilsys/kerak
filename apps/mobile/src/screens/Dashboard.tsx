import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import {
  getDaySummary,
  getCurrentRoutine,
  getNutritionData,
  generateRoutine,
  suggestMeal,
  addFoodLog,
} from "../utils/api";
import { useTheme } from "../theme/ThemeContext";
import { useFadeIn } from "../hooks/useAnimations";

const RING_SIZE = 130;
const STROKE = 10;
const R = (RING_SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

const BORDER_RADIUS_CARD = 20;
const BORDER_RADIUS_INNER = 14;
const BORDER_RADIUS_PILL = 10;

const STAGGER_MS = 100;

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const DAY_SHORT: Record<string, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mer",
  thursday: "Jeu",
  friday: "Ven",
  saturday: "Sam",
  sunday: "Dim",
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Petit-déj",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Snack",
};
const MEAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  snack: "cafe-outline",
};

function trackingDate(): string {
  const now = new Date();
  if (now.getHours() < 5) now.setDate(now.getDate() - 1);
  return now.toISOString().slice(0, 10);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function getTodayKey(): string {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[new Date().getDay()];
}

function useStagger(sectionCount: number) {
  const anims = useRef(
    Array.from({ length: sectionCount }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(18),
    })),
  ).current;

  useEffect(() => {
    const animations = anims.map((a, i) =>
      Animated.parallel([
        Animated.timing(a.opacity, {
          toValue: 1,
          duration: 450,
          delay: i * STAGGER_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(a.translateY, {
          toValue: 0,
          duration: 450,
          delay: i * STAGGER_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    Animated.stagger(0, animations).start();
  }, []);

  return anims.map((a) => ({
    opacity: a.opacity,
    transform: [{ translateY: a.translateY }],
  }));
}

function SpringPressable({
  onPress,
  style,
  children,
  accessibilityLabel,
}: {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  accessibilityLabel: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  }, []);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={{ minHeight: 44 }}
    >
      <Animated.View
        style={[style, { transform: [{ scale }] }]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

function CalorieRing({
  total,
  target,
  C,
}: {
  total: number;
  target: number;
  C: any;
}) {
  const pct = target > 0 ? Math.min(total / target, 1) : 0;
  const color = total <= target ? C.primary : C.accent;

  const animVal = useRef(new Animated.Value(0)).current;
  const [offset, setOffset] = useState(CIRC);

  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, {
      toValue: pct,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  useEffect(() => {
    const id = animVal.addListener(({ value }) =>
      setOffset(CIRC * (1 - value)),
    );
    return () => animVal.removeListener(id);
  }, []);

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" }}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: "absolute" }}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={R}
          stroke={C.border}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={R}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRC}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      <Text
        style={{
          fontSize: 28,
          fontWeight: "800",
          color: C.textPrimary,
          lineHeight: 32,
        }}
      >
        {total}
      </Text>
      <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
        / {target}
      </Text>
    </View>
  );
}

function MacroBar({
  label,
  value,
  color,
  max,
  C,
}: {
  label: string;
  value: number;
  color: string;
  max: number;
  C: any;
}) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct,
      duration: 800,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={{ marginBottom: 8 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "500", color: C.textSecondary }}>
          {label}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: "700", color: C.textPrimary }}>
          {value}
          <Text style={{ fontWeight: "400", color: C.textSecondary }}>g</Text>
        </Text>
      </View>
      <View
        style={{
          width: "100%",
          height: 6,
          borderRadius: 3,
          backgroundColor: C.border,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
            width: widthAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          }}
        />
      </View>
    </View>
  );
}

function SectionTitle({
  icon,
  title,
  onMore,
  moreLabel,
  C,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onMore?: () => void;
  moreLabel?: string;
  C: any;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        marginBottom: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: BORDER_RADIUS_PILL,
            backgroundColor: C.accent + "18",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={14} color={C.accent} />
        </View>
        <Text
          style={{ fontSize: 17, fontWeight: "700", color: C.textPrimary }}
        >
          {title}
        </Text>
      </View>
      {onMore && (
        <Pressable
          onPress={onMore}
          hitSlop={12}
          accessibilityLabel={moreLabel ?? "Voir plus"}
          accessibilityRole="button"
          style={({ pressed }) => ({
            opacity: pressed ? 0.5 : 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
            minHeight: 44,
            justifyContent: "center",
          })}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.accent }}>
            {moreLabel ?? "Voir"}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={C.accent} />
        </Pressable>
      )}
    </View>
  );
}

function AnimatedDropdown({ children }: { children: React.ReactNode }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 120, friction: 12 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      {children}
    </Animated.View>
  );
}

interface Props {
  onNavigateToTracking: () => void;
  onNavigateToRecipes: () => void;
  onNavigateToRoutine: () => void;
  onCookMeal?: (mealName: string, ingredients: string[]) => void;
}

export default function Dashboard({
  onNavigateToTracking,
  onNavigateToRecipes,
  onNavigateToRoutine,
  onCookMeal,
}: Props) {
  const { C } = useTheme();
  const stagger = useStagger(6);

  const [calorieTotal, setCalorieTotal] = useState(0);
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [byMeal, setByMeal] = useState<Record<string, number>>({});
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [macros, setMacros] = useState({
    avgProtein: 0,
    avgCarbs: 0,
    avgFats: 0,
    avgFiber: 0,
  });
  const [routine, setRoutine] = useState<any | null>(null);
  const [generatingRoutine, setGeneratingRoutine] = useState(false);
  const [mealSuggestions, setMealSuggestions] = useState<{ title: string; description: string; estimatedCalories: number; tip: string }[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestContext, setSuggestContext] = useState<"je_cuisine" | "je_mange_dehors" | null>(null);
  const [addedSuggestion, setAddedSuggestion] = useState<string | null>(null);

  const todayKey = getTodayKey();

  useEffect(() => {
    const date = trackingDate();

    getDaySummary(date)
      .then((s) => {
        setCalorieTotal(s.total);
        setCalorieTarget(s.target);
        setByMeal(s.byMeal);
      })
      .catch(() => {});

    getCurrentRoutine()
      .then((r) => setRoutine(r))
      .catch(() => {});

    getNutritionData(date, date)
      .then((n) =>
        setMacros({
          avgProtein: n.avgProtein,
          avgCarbs: n.avgCarbs,
          avgFats: n.avgFats,
          avgFiber: n.avgFiber,
        }),
      )
      .catch(() => {});
  }, []);

  const handleGenerateRoutine = useCallback(async () => {
    setGeneratingRoutine(true);
    try {
      const result = await generateRoutine();
      setRoutine(result);
    } catch {
    } finally {
      setGeneratingRoutine(false);
    }
  }, []);

  const handleSuggest = useCallback(async (context: "je_cuisine" | "je_mange_dehors") => {
    setSuggestContext(context);
    setSuggestLoading(true);
    setMealSuggestions([]);
    setAddedSuggestion(null);
    try {
      const remaining = calorieTarget - calorieTotal;
      const result = await suggestMeal({
        remainingCalories: Math.max(remaining, 0),
        remainingMacros: { proteins: Math.max(150 - macros.avgProtein, 0), carbs: Math.max(300 - macros.avgCarbs, 0), fats: Math.max(100 - macros.avgFats, 0) },
        context,
      });
      setMealSuggestions(result.suggestions || []);
    } catch {
      setMealSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  }, [calorieTarget, calorieTotal, macros]);

  const handleAddSuggestion = useCallback(async (suggestion: { title: string; estimatedCalories: number }) => {
    try {
      await addFoodLog({
        date: trackingDate(),
        meal: "dinner",
        label: suggestion.title,
        calories: suggestion.estimatedCalories,
      });
      setAddedSuggestion(suggestion.title);
      const s = await getDaySummary(trackingDate());
      setCalorieTotal(s.total);
      setCalorieTarget(s.target);
      setByMeal(s.byMeal);
    } catch {
    }
  }, []);

  const showSuggestionCard = (() => {
    const h = new Date().getHours();
    const noDinner = !byMeal["dinner"] || byMeal["dinner"] === 0;
    return h >= 16 || noDinner;
  })();

  const routinePlan = routine?.plan;
  const todayRoutine = routinePlan?.[todayKey];
  const hasMeals = Object.keys(byMeal).length > 0;
  const hasMacros =
    macros.avgProtein > 0 || macros.avgCarbs > 0 || macros.avgFats > 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: C.background }}
      edges={["top"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════
            1. HEADER
            ═══════════════════════════════════════════════════════ */}
        <Animated.View
          style={[
            { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
            stagger[0],
          ]}
        >
          <Text style={{ fontSize: 15, color: C.textSecondary, marginBottom: 2 }}>
            {getGreeting()} !
          </Text>
          <Text
            style={{ fontSize: 30, fontWeight: "800", color: C.textPrimary }}
          >
            Kerak
          </Text>
        </Animated.View>

        {/* ═══════════════════════════════════════════════════════
            2. CALORIE PROGRESS CARD (Hero)
            ═══════════════════════════════════════════════════════ */}
        <Animated.View style={[{ paddingHorizontal: 24, marginBottom: 24 }, stagger[1]]}>
          <SpringPressable
            onPress={onNavigateToTracking}
            accessibilityLabel="Voir le suivi calorique"
            style={{
              backgroundColor: C.card,
              borderRadius: BORDER_RADIUS_CARD,
              padding: 20,
              borderWidth: 1,
              borderColor: C.border,
              shadowColor: C.textPrimary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            {/* Top row: ring + meal breakdown */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <CalorieRing total={calorieTotal} target={calorieTarget} C={C} />

              <View style={{ flex: 1, marginLeft: 24, gap: 8 }}>
                {hasMeals ? (
                  Object.entries(byMeal).map(([key, val]) => (
                    <View
                      key={key}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        minHeight: 24,
                      }}
                    >
                      <Ionicons
                        name={MEAL_ICONS[key] ?? "restaurant-outline"}
                        size={15}
                        color={C.teal}
                      />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 13,
                          color: C.textSecondary,
                          fontWeight: "500",
                        }}
                      >
                        {MEAL_LABELS[key] ?? key}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: C.textPrimary,
                        }}
                      >
                        {val}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={{ alignItems: "center", gap: 8, paddingVertical: 8 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        color: C.textSecondary,
                        textAlign: "center",
                      }}
                    >
                      Aucun repas enregistré
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: C.accent,
                      }}
                    >
                      Ajouter →
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Macro bars */}
            {hasMacros && (
              <View
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: C.border,
                }}
              >
                <MacroBar
                  label="Protéines"
                  value={macros.avgProtein}
                  color={C.teal}
                  max={150}
                  C={C}
                />
                <MacroBar
                  label="Glucides"
                  value={macros.avgCarbs}
                  color={C.accent}
                  max={300}
                  C={C}
                />
                <MacroBar
                  label="Lipides"
                  value={macros.avgFats}
                  color={C.amber}
                  max={100}
                  C={C}
                />
                <MacroBar
                  label="Fibres"
                  value={macros.avgFiber}
                  color={C.primary}
                  max={35}
                  C={C}
                />
              </View>
            )}
          </SpringPressable>

        </Animated.View>

        {/* ═══════════════════════════════════════════════════════
            MEAL SUGGESTION (moved here)
            ═══════════════════════════════════════════════════════ */}
        {showSuggestionCard && (
          <Animated.View style={[{ paddingHorizontal: 24, marginBottom: 16 }, stagger[2]]}>
            <View style={{ backgroundColor: C.card, borderRadius: BORDER_RADIUS_CARD, padding: 20, borderWidth: 1, borderColor: C.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Ionicons name="flame" size={20} color={C.accent} />
                <Text style={{ fontSize: 16, fontWeight: "700", color: C.textPrimary }}>
                  Il te reste ~{Math.max(calorieTarget - calorieTotal, 0)} kcal
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: suggestContext ? 16 : 0 }}>
                {([
                  { key: "je_cuisine" as const, label: "Je cuisine", icon: "restaurant-outline" as keyof typeof Ionicons.glyphMap },
                  { key: "je_mange_dehors" as const, label: "Je mange dehors", icon: "compass-outline" as keyof typeof Ionicons.glyphMap },
                ]).map((ctx) => {
                  const isActive = suggestContext === ctx.key;
                  return (
                    <Pressable key={ctx.key} onPress={() => handleSuggest(ctx.key)} accessibilityLabel={ctx.label}
                      style={({ pressed }) => ({ flex: 1, paddingVertical: 10, borderRadius: BORDER_RADIUS_INNER, backgroundColor: isActive ? C.accent + "18" : C.background, borderWidth: 1, borderColor: isActive ? C.accent : C.border, alignItems: "center", gap: 4, opacity: pressed ? 0.7 : 1, minHeight: 44, justifyContent: "center" })}
                    >
                      <Ionicons name={ctx.icon} size={18} color={isActive ? C.accent : C.textSecondary} />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: isActive ? C.accent : C.textSecondary, textAlign: "center" }}>{ctx.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {suggestLoading && (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <ActivityIndicator size="small" color={C.accent} />
                  <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 8 }}>On cherche des idées...</Text>
                </View>
              )}
              {!suggestLoading && mealSuggestions.length > 0 && (
                <View style={{ gap: 10 }}>
                  {mealSuggestions.map((s, i) => {
                    const isAdded = addedSuggestion === s.title;
                    return (
                      <Pressable key={i} onPress={() => !isAdded && handleAddSuggestion(s)} disabled={isAdded}
                        style={({ pressed }) => ({ backgroundColor: isAdded ? C.success + "12" : pressed ? C.accent + "10" : C.background, borderRadius: BORDER_RADIUS_INNER, padding: 14, borderWidth: 1, borderColor: isAdded ? C.success + "30" : C.border, opacity: pressed && !isAdded ? 0.85 : 1 })}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: C.textPrimary, flex: 1 }} numberOfLines={1}>{s.title}</Text>
                          {isAdded ? (
                            <Text style={{ fontSize: 12, fontWeight: "700", color: C.success, marginLeft: 8 }}>Bonne idée !</Text>
                          ) : (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 8 }}>
                              <Ionicons name="flame-outline" size={14} color={C.accent} />
                              <Text style={{ fontSize: 13, fontWeight: "600", color: C.accent }}>~{s.estimatedCalories} kcal</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 18, marginBottom: s.tip ? 6 : 0 }}>{s.description}</Text>
                        {!!s.tip && (
                          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: C.accent + "08", borderRadius: 8, padding: 8 }}>
                            <Ionicons name="bulb-outline" size={14} color={C.accent} style={{ marginTop: 1 }} />
                            <Text style={{ fontSize: 12, color: C.accent, flex: 1, lineHeight: 16 }}>{s.tip}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* ═══════════════════════════════════════════════════════
            CTA — Générer des recettes
            ═══════════════════════════════════════════════════════ */}
        <Animated.View style={[{ paddingHorizontal: 24, marginBottom: 20 }, stagger[2]]}>
          <SpringPressable
            onPress={onNavigateToRecipes}
            accessibilityLabel="Générer des recettes"
            style={{
              backgroundColor: C.accent + "12",
              borderRadius: BORDER_RADIUS_CARD,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderWidth: 1,
              borderColor: C.accent + "25",
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.accent + "20", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="sparkles" size={20} color={C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: C.textPrimary }}>Générer des recettes</Text>
              <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }}>Recettes du jour et personnalisées</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.accent} />
          </SpringPressable>
        </Animated.View>

        {/* ═══════════════════════════════════════════════════════
            3. ROUTINE SECTION
            ═══════════════════════════════════════════════════════ */}
        <Animated.View style={[{ marginBottom: 24 }, stagger[2]]}>
          {routinePlan ? (
            <>
              {/* Routine du jour */}
              <SectionTitle
                icon="calendar-outline"
                title="Routine du jour"
                onMore={onNavigateToRoutine}
                moreLabel="Semaine"
                C={C}
              />
              <View
                style={{
                  marginHorizontal: 24,
                  backgroundColor: C.card,
                  borderRadius: BORDER_RADIUS_CARD,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: C.border,
                  marginBottom: 16,
                }}
              >
                {["breakfast", "lunch", "snack", "dinner"].map((mealKey, i) => {
                  const meal = todayRoutine?.[mealKey];
                  if (!meal) return null;
                  const isDone = (byMeal[mealKey] ?? 0) > 0;
                  const isExpanded = expandedMeal === mealKey;
                  return (
                    <View key={mealKey}>
                      {i > 0 && <View style={{ height: 1, backgroundColor: C.border }} />}
                      <Pressable
                        onPress={() => !isDone && setExpandedMeal(isExpanded ? null : mealKey)}
                        disabled={isDone}
                        style={({ pressed }) => ({
                          paddingVertical: 12,
                          opacity: isDone ? 0.5 : pressed ? 0.8 : 1,
                        })}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                          {isDone ? (
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.success + "20", alignItems: "center", justifyContent: "center" }}>
                              <Ionicons name="checkmark" size={13} color={C.success} />
                            </View>
                          ) : (
                            <Ionicons
                              name={MEAL_ICONS[mealKey] ?? "restaurant-outline"}
                              size={16}
                              color={C.teal}
                            />
                          )}
                          <Text
                            style={{
                              flex: 1,
                              fontSize: 14,
                              fontWeight: "600",
                              color: isDone ? C.textSecondary : C.textPrimary,
                              textDecorationLine: isDone ? "line-through" : "none",
                            }}
                          >
                            {meal.name}
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: isDone ? C.success : C.accent }}>
                            {isDone ? "Fait" : `${meal.calories} kcal`}
                          </Text>
                          {!isDone && (
                            <Ionicons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={16}
                              color={C.textSecondary}
                            />
                          )}
                        </View>
                      </Pressable>

                      {/* Dropdown */}
                      {isExpanded && !isDone && (
                        <AnimatedDropdown>
                        <View
                          style={{
                            backgroundColor: C.background,
                            borderRadius: 12,
                            padding: 14,
                            marginBottom: 4,
                            gap: 10,
                          }}
                        >
                          {!!meal.description && (
                            <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 19 }}>
                              {meal.description}
                            </Text>
                          )}
                          {Array.isArray(meal.ingredients) && meal.ingredients.length > 0 && (
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                              {meal.ingredients.slice(0, 6).map((ing: string, idx: number) => (
                                <View
                                  key={idx}
                                  style={{
                                    backgroundColor: C.accent + "10",
                                    borderRadius: 6,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                  }}
                                >
                                  <Text style={{ fontSize: 11, color: C.accent, fontWeight: "500" }}>{ing}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                          <Pressable
                            onPress={() => onCookMeal?.(meal.name, Array.isArray(meal.ingredients) ? meal.ingredients : [])}
                            style={({ pressed }) => ({
                              backgroundColor: C.accent,
                              borderRadius: 10,
                              paddingVertical: 10,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              opacity: pressed ? 0.85 : 1,
                            })}
                          >
                            <Ionicons name="restaurant" size={15} color={C.white} />
                            <Text style={{ fontSize: 14, fontWeight: "700", color: C.white }}>
                              Cuisiner
                            </Text>
                          </Pressable>
                        </View>
                        </AnimatedDropdown>
                      )}
                    </View>
                  );
                })}
                {todayRoutine?.total && (
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: C.border,
                      paddingTop: 12,
                      marginTop: 4,
                      alignItems: "flex-end",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: C.textPrimary,
                      }}
                    >
                      Total : {todayRoutine.total} kcal
                    </Text>
                  </View>
                )}
              </View>

            </>
          ) : (
            /* ── No routine: promotional CTA ── */
            <View style={{ paddingHorizontal: 24 }}>
              <View
                style={{
                  backgroundColor: C.card,
                  borderRadius: BORDER_RADIUS_CARD,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: C.border,
                  overflow: "hidden",
                }}
              >
                {/* Date decoration */}
                <View style={{ position: "absolute", top: -20, right: -10, opacity: 0.06 }}>
                  <Text style={{ fontSize: 120, fontWeight: "900", color: C.accent }}>
                    {new Date().getDate()}
                  </Text>
                </View>

                {/* Icon */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: C.accent + "18",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={24}
                    color={C.accent}
                  />
                </View>

                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: C.textPrimary,
                    marginBottom: 8,
                  }}
                >
                  Planifiez vos repas
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: C.textSecondary,
                    lineHeight: 20,
                    marginBottom: 20,
                  }}
                >
                  {(() => {
                    const jsDay = new Date().getDay();
                    const remaining = jsDay === 0 ? 1 : 8 - jsDay;
                    return remaining <= 2
                      ? "Générez un plan pour demain et commencez la semaine du bon pied"
                      : `Générez un plan pour les ${remaining} jours restants de la semaine`;
                  })()}
                </Text>

                {/* CTA Button */}
                <Pressable
                  onPress={onNavigateToRoutine}
                  disabled={false}
                  accessibilityLabel="Générer ma routine"
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    backgroundColor: C.accent,
                    borderRadius: BORDER_RADIUS_INNER,
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    minHeight: 48,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: "#FFFFFF",
                    }}
                  >
                    Planifier ma semaine
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </Animated.View>


        {/* ═══════════════════════════════════════════════════════
            5. COOK NOW SUGGESTION
            ═══════════════════════════════════════════════════════ */}
        <Animated.View
          style={[
            {
              paddingHorizontal: 24,
              gap: 10,
              marginBottom: 16,
            },
            stagger[4],
          ]}
        >
          {/* Cook now: suggest the current routine meal */}
          {(() => {
            if (!todayRoutine) return null;
            const h = new Date().getHours();
            let mealKey = "dinner";
            let mealLabel = "dîner";
            if (h < 10) { mealKey = "breakfast"; mealLabel = "petit-déjeuner"; }
            else if (h < 15) { mealKey = "lunch"; mealLabel = "déjeuner"; }
            if ((byMeal[mealKey] ?? 0) > 0) return null;
            const meal = todayRoutine[mealKey];
            if (!meal) return null;
            return (
              <SpringPressable
                onPress={() => onCookMeal?.(meal.name, Array.isArray(meal.ingredients) ? meal.ingredients : [])}
                accessibilityLabel={`Cuisiner ${meal.name}`}
                style={{
                  backgroundColor: C.accent + "12",
                  borderRadius: BORDER_RADIUS_CARD,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  borderWidth: 1,
                  borderColor: C.accent + "25",
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: C.accent + "20",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="restaurant" size={22} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: C.accent, fontWeight: "600", marginBottom: 2 }}>
                    C'est l'heure du {mealLabel}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: C.textPrimary }} numberOfLines={1}>
                    {meal.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }}>
                    {meal.calories} kcal · Appuyez pour cuisiner
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.accent} />
              </SpringPressable>
            );
          })()}

        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}
