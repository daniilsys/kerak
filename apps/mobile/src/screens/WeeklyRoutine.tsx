import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  ActivityIndicator,
  Easing,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { IconButton } from "../components/IconButton";
import {
  getCurrentRoutine,
  generateRoutine,
  deleteRoutine,
  updateRoutinePlan,
  getDaySummary,
  type RoutineOptions,
} from "../utils/api";

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type DayKey = (typeof DAY_KEYS)[number];

const DAY_LABELS: Record<DayKey, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

const DAY_SHORT: Record<DayKey, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mer",
  thursday: "Jeu",
  friday: "Ven",
  saturday: "Sam",
  sunday: "Dim",
};

const MEAL_KEYS = ["breakfast", "lunch", "snack", "dinner"] as const;

const MEAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  snack: "cafe-outline",
  dinner: "moon-outline",
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Petit-déj",
  lunch: "Déjeuner",
  snack: "Goûter",
  dinner: "Dîner",
};

const RADIUS_CARD = 20;
const RADIUS_INNER = 14;
const RADIUS_PILL = 10;
const SP = 8;

function getTodayIndex(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function getDayTotal(dayPlan: any): number {
  if (!dayPlan) return 0;
  if (dayPlan.total != null) return dayPlan.total;
  let sum = 0;
  for (const k of MEAL_KEYS) {
    if (dayPlan[k]?.calories) sum += dayPlan[k].calories;
  }
  return sum;
}

interface Props {
  onBack: () => void;
  onCookMeal?: (name: string, ingredients: string[]) => void;
}

export default function WeeklyRoutine({ onBack, onCookMeal }: Props) {
  const { C } = useTheme();
  const [routine, setRoutine] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(getTodayIndex);
  const [showRegenOptions, setShowRegenOptions] = useState(false);
  const [completedMeals, setCompletedMeals] = useState<Record<string, boolean>>(
    {},
  );

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;

  const pillAnims = useRef(DAY_KEYS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    getCurrentRoutine()
      .then((r) => setRoutine(r))
      .catch(() => {})
      .finally(() => setLoading(false));

    const now = new Date();
    const todayDate =
      now.getHours() < 5
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        : now;
    const dateStr = todayDate.toISOString().slice(0, 10);
    getDaySummary(dateStr)
      .then((s) => {
        const done: Record<string, boolean> = {};
        for (const [key, val] of Object.entries(s.byMeal)) {
          if ((val as number) > 0) done[key] = true;
        }
        setCompletedMeals(done);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (routine?.plan) {
      const anims = pillAnims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          delay: i * 50,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      );
      Animated.stagger(50, anims).start();
    }
  }, [routine]);

  const selectDay = useCallback(
    (idx: number) => {
      if (idx === selectedIdx) return;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: idx > selectedIdx ? 16 : -16,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSelectedIdx(idx);
        translateAnim.setValue(idx > selectedIdx ? -16 : 16);
        Animated.parallel([
          Animated.spring(fadeAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }),
          Animated.spring(translateAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }),
        ]).start();
      });
    },
    [selectedIdx, fadeAnim, translateAnim],
  );

  const handleGenerate = useCallback(async (options?: RoutineOptions) => {
    setGenerating(true);
    try {
      const r = await generateRoutine(options);
      setRoutine(r);
    } catch {
      Alert.alert("Erreur", "Impossible de générer la routine. Réessayez.");
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleEditMeal = useCallback(
    (dayKey: string, mealKey: string, meal: any) => {
      Alert.alert(meal.name, `${meal.calories} kcal`, [
        { text: "Annuler", style: "cancel" },
        {
          text: "Repas libre",
          onPress: () => {
            const newPlan = { ...(routine?.plan ?? {}) };
            newPlan[dayKey] = { ...newPlan[dayKey] };
            newPlan[dayKey][mealKey] = {
              name: "Repas libre",
              calories: Math.round((routine?.target ?? 2000) / 3),
              description: "Repas à l'extérieur ou libre",
              ingredients: [],
            };
            let total = 0;
            for (const k of MEAL_KEYS) {
              if (newPlan[dayKey][k]?.calories)
                total += newPlan[dayKey][k].calories;
            }
            if (newPlan[dayKey].snack?.calories)
              total += newPlan[dayKey].snack.calories;
            newPlan[dayKey].total = total;
            setRoutine({ ...routine, plan: newPlan });
            if (routine?.id)
              updateRoutinePlan(routine.id, newPlan).catch(() => {});
          },
        },
        {
          text: "Modifier calories",
          onPress: () => {
            Alert.prompt?.(
              "Calories",
              `Nouvelles calories pour ${meal.name}`,
              (text: string) => {
                const cal = parseInt(text, 10);
                if (isNaN(cal) || cal <= 0) return;
                const newPlan = { ...(routine?.plan ?? {}) };
                newPlan[dayKey] = { ...newPlan[dayKey] };
                newPlan[dayKey][mealKey] = { ...meal, calories: cal };
                let total = 0;
                for (const k of MEAL_KEYS) {
                  if (newPlan[dayKey][k]?.calories)
                    total += newPlan[dayKey][k].calories;
                }
                if (newPlan[dayKey].snack?.calories)
                  total += newPlan[dayKey].snack.calories;
                newPlan[dayKey].total = total;
                setRoutine({ ...routine, plan: newPlan });
                if (routine?.id)
                  updateRoutinePlan(routine.id, newPlan).catch(() => {});
              },
              "plain-text",
              meal.calories.toString(),
              "number-pad",
            );
          },
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            const newPlan = { ...(routine?.plan ?? {}) };
            newPlan[dayKey] = { ...newPlan[dayKey] };
            delete newPlan[dayKey][mealKey];
            let total = 0;
            for (const k of MEAL_KEYS) {
              if (newPlan[dayKey][k]?.calories)
                total += newPlan[dayKey][k].calories;
            }
            if (newPlan[dayKey].snack?.calories)
              total += newPlan[dayKey].snack.calories;
            newPlan[dayKey].total = total;
            setRoutine({ ...routine, plan: newPlan });
            if (routine?.id)
              updateRoutinePlan(routine.id, newPlan).catch(() => {});
          },
        },
      ]);
    },
    [routine],
  );

  const handleDelete = useCallback(() => {
    if (!routine) return;
    Alert.alert(
      "Supprimer la routine",
      "Voulez-vous supprimer votre plan de la semaine ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRoutine(routine.id);
              setRoutine(null);
            } catch {}
          },
        },
      ],
    );
  }, [routine]);

  const plan = routine?.plan;
  const target = routine?.target ?? 0;

  const dailyTotals = useMemo(() => {
    if (!plan) return DAY_KEYS.map(() => 0);
    return DAY_KEYS.map((k) => getDayTotal(plan[k]));
  }, [plan]);

  const maxTotal = useMemo(
    () => Math.max(...dailyTotals, target, 1),
    [dailyTotals, target],
  );

  const avgKcal = useMemo(() => {
    const filled = dailyTotals.filter((t) => t > 0);
    if (filled.length === 0) return 0;
    return Math.round(filled.reduce((a, b) => a + b, 0) / filled.length);
  }, [dailyTotals]);

  const selectedDayKey = DAY_KEYS[selectedIdx];
  const selectedDayPlan = plan?.[selectedDayKey];
  const todayIdx = getTodayIndex();


  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: C.background }}
      edges={["top"]}
    >
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: SP * 2.5,
          paddingVertical: SP * 1.5,
        }}
      >
        <IconButton icon="arrow-back" onPress={onBack} size={44} />
        <View style={{ flex: 1, marginLeft: SP * 1.5 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: C.textPrimary,
            }}
          >
            Routine
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: C.textSecondary,
              marginTop: 2,
            }}
          >
            {routine ? `Objectif : ${target} kcal/jour` : "Planifiez vos repas"}
          </Text>
        </View>
        {plan && (
          <IconButton
            icon="trash-outline"
            onPress={handleDelete}
            size={44}
            iconSize={18}
            color={C.error}
            bg={C.error + "12"}
          />
        )}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : generating ? (
        <GeneratingState C={C} />
      ) : !plan ? (
        <EmptyState C={C} onGenerate={handleGenerate} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: SP * 2.5,
            paddingBottom: SP * 12,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Day selector pills ── */}
          <DayPillStrip
            dailyTotals={dailyTotals}
            target={target}
            selectedIdx={selectedIdx}
            todayIdx={todayIdx}
            pillAnims={pillAnims}
            onSelect={selectDay}
            C={C}
          />

          {/* ── Selected day detail ── */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: translateAnim }],
            }}
          >
            <DayDetailCard
              dayKey={selectedDayKey}
              dayPlan={selectedDayPlan}
              total={dailyTotals[selectedIdx]}
              isToday={selectedIdx === todayIdx}
              completedMeals={selectedIdx === todayIdx ? completedMeals : {}}
              onEditMeal={(mealKey, meal) =>
                handleEditMeal(selectedDayKey, mealKey, meal)
              }
              onCookMeal={onCookMeal}
              C={C}
            />
          </Animated.View>

          {/* ── Week overview mini bars ── */}
          <WeekBarChart
            dailyTotals={dailyTotals}
            maxTotal={maxTotal}
            target={target}
            todayIdx={todayIdx}
            avgKcal={avgKcal}
            C={C}
          />

          {/* ── Regenerate section ── */}
          {showRegenOptions ? (
            <View style={{ marginTop: SP * 2 }}>
              <RegenOptions
                C={C}
                onGenerate={(opts) => {
                  setShowRegenOptions(false);
                  handleGenerate(opts);
                }}
                onCancel={() => setShowRegenOptions(false)}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => setShowRegenOptions(true)}
              accessibilityLabel="Régénérer la routine"
              style={({ pressed }) => ({
                marginTop: SP * 2,
                backgroundColor: C.card,
                borderRadius: RADIUS_INNER,
                paddingVertical: SP * 2,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: SP,
                borderWidth: 1,
                borderColor: C.border,
                minHeight: 48,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Ionicons name="refresh" size={18} color={C.accent} />
              <Text
                style={{ fontSize: 15, fontWeight: "600", color: C.accent }}
              >
                Régénérer avec options
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function DayPillStrip({
  dailyTotals,
  target,
  selectedIdx,
  todayIdx,
  pillAnims,
  onSelect,
  C,
}: {
  dailyTotals: number[];
  target: number;
  selectedIdx: number;
  todayIdx: number;
  pillAnims: Animated.Value[];
  onSelect: (idx: number) => void;
  C: any;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const PILL_WIDTH = 48 + SP * 4 + SP;

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        x: Math.max(0, todayIdx * PILL_WIDTH - PILL_WIDTH),
        animated: true,
      });
    }, 400);
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: SP,
        paddingVertical: SP * 1.5,
      }}
    >
      {DAY_KEYS.map((dayKey, i) => {
        const isSelected = i === selectedIdx;
        const total = dailyTotals[i];
        const hasData = total > 0;
        const isPast = !hasData && i < todayIdx;
        const withinTarget =
          target > 0 && hasData && Math.abs(total - target) <= 100;
        const overTarget = target > 0 && hasData && total > target + 100;
        const hasDot = hasData;

        const scaleRef = useRef(new Animated.Value(1)).current;

        const onPressIn = () => {
          Animated.spring(scaleRef, {
            toValue: 0.9,
            useNativeDriver: true,
            tension: 200,
            friction: 10,
          }).start();
        };

        const onPressOut = () => {
          Animated.spring(scaleRef, {
            toValue: 1,
            useNativeDriver: true,
            tension: 200,
            friction: 10,
          }).start();
        };

        return (
          <Animated.View
            key={dayKey}
            style={{
              opacity: pillAnims[i],
              transform: [
                {
                  translateY: pillAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
                { scale: scaleRef },
              ],
            }}
          >
            <Pressable
              onPress={() => (hasData ? onSelect(i) : undefined)}
              disabled={isPast}
              onPressIn={hasData ? onPressIn : undefined}
              onPressOut={hasData ? onPressOut : undefined}
              accessibilityLabel={`${DAY_LABELS[dayKey]}${i === todayIdx ? ", aujourd'hui" : ""}${hasDot ? `, ${dailyTotals[i]} kilocalories` : isPast ? ", passé" : ""}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              style={{
                minWidth: 48,
                minHeight: 48,
                paddingHorizontal: SP * 2,
                paddingVertical: SP * 1.25,
                borderRadius: RADIUS_PILL,
                backgroundColor: isSelected ? C.accent : C.card,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: isSelected ? 0 : 1,
                borderColor: C.border,
                opacity: isPast ? 0.35 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: isSelected ? C.card : C.textPrimary,
                  marginBottom: hasDot ? 4 : 0,
                }}
              >
                {DAY_SHORT[dayKey]}
              </Text>
              {hasDot && (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: withinTarget
                      ? C.success
                      : overTarget
                        ? C.amber
                        : isSelected
                          ? C.card
                          : C.textSecondary,
                  }}
                />
              )}
            </Pressable>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}


function MealDropdown({
  meal,
  mealKey,
  onEditMeal,
  onCookMeal,
  C,
}: {
  meal: any;
  mealKey: string;
  onEditMeal: (mealKey: string, meal: any) => void;
  onCookMeal?: (name: string, ingredients: string[]) => void;
  C: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 12,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        backgroundColor: C.background,
        borderRadius: 12,
        padding: 14,
        marginTop: SP,
        marginBottom: SP * 0.5,
        gap: 10,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {!!meal.description && (
        <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 19 }}>
          {meal.description}
        </Text>
      )}
      {Array.isArray(meal.ingredients) && meal.ingredients.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
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
              <Text
                style={{ fontSize: 11, color: C.accent, fontWeight: "500" }}
              >
                {ing}
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: "row", gap: SP }}>
        {onCookMeal && (
          <Pressable
            onPress={() =>
              onCookMeal(
                meal.name,
                Array.isArray(meal.ingredients) ? meal.ingredients : [],
              )
            }
            style={({ pressed }) => ({
              flex: 2,
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
            <Ionicons name="restaurant" size={14} color={C.card} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: C.card }}>
              Cuisiner
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => onEditMeal(mealKey, meal)}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: C.card,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: C.border,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="create-outline" size={14} color={C.textSecondary} />
          <Text
            style={{ fontSize: 13, fontWeight: "600", color: C.textSecondary }}
          >
            Modifier
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function DayDetailCard({
  dayKey,
  dayPlan,
  total,
  isToday,
  completedMeals,
  onEditMeal,
  onCookMeal,
  C,
}: {
  dayKey: DayKey;
  dayPlan: any;
  completedMeals: Record<string, boolean>;
  onEditMeal: (mealKey: string, meal: any) => void;
  onCookMeal?: (name: string, ingredients: string[]) => void;
  total: number;
  isToday: boolean;
  C: any;
}) {
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  if (!dayPlan) {
    return (
      <View
        style={{
          backgroundColor: C.card,
          borderRadius: RADIUS_CARD,
          padding: SP * 3,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 160,
          ...cardShadow,
        }}
      >
        <Ionicons
          name="restaurant-outline"
          size={32}
          color={C.textSecondary + "60"}
        />
        <Text
          style={{
            fontSize: 15,
            color: C.textSecondary,
            marginTop: SP,
          }}
        >
          Aucun repas pour ce jour
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: RADIUS_CARD,
        padding: SP * 2.5,
        borderWidth: isToday ? 2 : 0,
        borderColor: isToday ? C.accent : "transparent",
        ...cardShadow,
      }}
    >
      {/* Day header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: SP * 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: SP }}>
          {isToday && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: C.accent,
              }}
            />
          )}
          <Text
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: isToday ? C.accent : C.textPrimary,
            }}
          >
            {DAY_LABELS[dayKey]}
          </Text>
          {isToday && (
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: C.accent,
              }}
            >
              Aujourd'hui
            </Text>
          )}
        </View>
        <View
          style={{
            backgroundColor: C.accent + "18",
            borderRadius: RADIUS_PILL,
            paddingHorizontal: SP * 1.5,
            paddingVertical: SP * 0.5,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: C.accent,
            }}
          >
            {total} kcal
          </Text>
        </View>
      </View>

      {/* Meal rows */}
      {MEAL_KEYS.map((mealKey, i) => {
        const meal = dayPlan[mealKey];
        if (!meal) return null;
        const isDone = !!completedMeals[mealKey];
        const isExpanded = expandedMeal === mealKey;

        return (
          <View key={mealKey}>
            {i > 0 && (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: C.border,
                  marginVertical: SP * 1.5,
                }}
              />
            )}
            <Pressable
              onPress={() =>
                !isDone && setExpandedMeal(isExpanded ? null : mealKey)
              }
              onLongPress={() => !isDone && onEditMeal(mealKey, meal)}
              delayLongPress={400}
              disabled={isDone}
              style={({ pressed }) => ({
                opacity: isDone ? 0.5 : pressed ? 0.85 : 1,
              })}
              accessibilityLabel={`${MEAL_LABELS[mealKey]} : ${meal.name}. Appuyer pour détails, maintenir pour modifier.`}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: SP * 1.5,
                  minHeight: 44,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: isDone ? C.success + "15" : C.teal + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 2,
                  }}
                >
                  <Ionicons
                    name={
                      isDone
                        ? "checkmark"
                        : (MEAL_ICONS[mealKey] ?? "restaurant-outline")
                    }
                    size={isDone ? 20 : 18}
                    color={isDone ? C.success : C.teal}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: C.textSecondary,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 2,
                    }}
                  >
                    {MEAL_LABELS[mealKey]}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: isDone ? C.textSecondary : C.textPrimary,
                        flex: 1,
                        marginRight: SP,
                        textDecorationLine: isDone ? "line-through" : "none",
                      }}
                      numberOfLines={isExpanded ? undefined : 2}
                    >
                      {meal.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isDone ? C.success : C.accent,
                      }}
                    >
                      {isDone ? "Fait ✓" : `${meal.calories} kcal`}
                    </Text>
                    {!isDone && (
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={C.textSecondary}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </View>
                </View>
              </View>
            </Pressable>

            {/* Dropdown */}
            {isExpanded && !isDone && (
              <MealDropdown
                meal={meal}
                mealKey={mealKey}
                onEditMeal={onEditMeal}
                onCookMeal={onCookMeal}
                C={C}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}


const BAR_CHART_HEIGHT = 100;

function WeekBarChart({
  dailyTotals,
  maxTotal,
  target,
  todayIdx,
  avgKcal,
  C,
}: {
  dailyTotals: number[];
  maxTotal: number;
  target: number;
  todayIdx: number;
  avgKcal: number;
  C: any;
}) {
  const targetRatio = target > 0 ? target / maxTotal : 0;

  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: RADIUS_CARD,
        padding: SP * 2.5,
        marginTop: SP * 2,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: C.textPrimary,
          marginBottom: SP * 2,
        }}
      >
        Apercu de la semaine
      </Text>

      <View
        style={{
          height: BAR_CHART_HEIGHT,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: SP,
        }}
      >
        {/* Target line */}
        {target > 0 && (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: BAR_CHART_HEIGHT * targetRatio,
              height: 1,
              borderStyle: "dashed",
              borderWidth: 1,
              borderColor: C.accent + "60",
              borderRadius: 0,
            }}
          />
        )}

        {dailyTotals.map((total, i) => {
          const ratio = maxTotal > 0 ? total / maxTotal : 0;
          const isToday = i === todayIdx;

          return (
            <View
              key={DAY_KEYS[i]}
              style={{
                flex: 1,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: "100%",
                  maxWidth: 28,
                  height: Math.max(ratio * BAR_CHART_HEIGHT, 4),
                  borderRadius: 6,
                  backgroundColor: isToday ? C.accent : C.primary + "40",
                }}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isToday ? "700" : "500",
                  color: isToday ? C.accent : C.textSecondary,
                  marginTop: 4,
                }}
              >
                {DAY_SHORT[DAY_KEYS[i]].charAt(0)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Average */}
      <View
        style={{
          marginTop: SP * 2,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: SP * 0.75,
        }}
      >
        <Ionicons name="analytics-outline" size={14} color={C.textSecondary} />
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: C.textSecondary,
          }}
        >
          Moyenne : {avgKcal} kcal/jour
        </Text>
      </View>
    </View>
  );
}


function OptionToggle({
  label,
  icon,
  active,
  onPress,
  C,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  C: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SP * 1.5,
        backgroundColor: active ? C.accent + "15" : C.card,
        borderRadius: RADIUS_PILL,
        paddingVertical: SP * 1.5,
        paddingHorizontal: SP * 2,
        borderWidth: 1,
        borderColor: active ? C.accent + "40" : C.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? C.accent : C.textSecondary}
      />
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: active ? C.accent : C.textPrimary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function OptionPill({
  label,
  active,
  onPress,
  C,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  C: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: SP,
        paddingHorizontal: SP * 1.5,
        borderRadius: RADIUS_PILL,
        backgroundColor: active ? C.accent : C.card,
        borderWidth: 1,
        borderColor: active ? C.accent : C.border,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: active ? C.card : C.textSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({
  C,
  onGenerate,
}: {
  C: any;
  onGenerate: (options: RoutineOptions) => void;
}) {
  const [snacks, setSnacks] = useState(false);
  const [budget, setBudget] = useState<"low" | "medium" | "high">("medium");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">(
    "beginner",
  );
  const [dietary, setDietary] = useState<string[]>([]);

  const toggleDietary = (item: string) => {
    setDietary((prev) =>
      prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item],
    );
  };

  const handleGenerate = () => {
    onGenerate({
      includeSnacks: snacks,
      budget,
      cookingLevel: level,
      dietary: dietary.length > 0 ? dietary : undefined,
    });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: SP * 3,
        paddingBottom: 100,
        paddingTop: SP * 2,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ alignItems: "center", marginBottom: SP * 3 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            backgroundColor: C.accent + "18",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: SP * 2,
          }}
        >
          <Ionicons name="calendar-outline" size={32} color={C.accent} />
        </View>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: C.textPrimary,
            textAlign: "center",
            marginBottom: SP,
          }}
        >
          Planifiez votre semaine
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: C.textSecondary,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          Personnalisez votre routine selon vos besoins
        </Text>
      </View>

      {/* Options */}
      <View
        style={{
          backgroundColor: C.card,
          borderRadius: RADIUS_CARD,
          padding: SP * 2.5,
          borderWidth: 1,
          borderColor: C.border,
          gap: SP * 2.5,
        }}
      >
        {/* Snacks toggle */}
        <OptionToggle
          label="Inclure des encas"
          icon="cafe-outline"
          active={snacks}
          onPress={() => setSnacks(!snacks)}
          C={C}
        />

        {/* Budget */}
        <View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: C.textSecondary,
              marginBottom: SP,
              marginLeft: 4,
            }}
          >
            Budget
          </Text>
          <View style={{ flexDirection: "row", gap: SP }}>
            {(
              [
                ["low", "Serré"],
                ["medium", "Normal"],
                ["high", "Confort"],
              ] as const
            ).map(([key, label]) => (
              <OptionPill
                key={key}
                label={label}
                active={budget === key}
                onPress={() => setBudget(key)}
                C={C}
              />
            ))}
          </View>
        </View>

        {/* Cooking level */}
        <View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: C.textSecondary,
              marginBottom: SP,
              marginLeft: 4,
            }}
          >
            Niveau de cuisine
          </Text>
          <View style={{ flexDirection: "row", gap: SP }}>
            {(
              [
                ["beginner", "Débutant"],
                ["intermediate", "Intermédiaire"],
                ["advanced", "Avancé"],
              ] as const
            ).map(([key, label]) => (
              <OptionPill
                key={key}
                label={label}
                active={level === key}
                onPress={() => setLevel(key)}
                C={C}
              />
            ))}
          </View>
        </View>

        {/* Dietary */}
        <View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: C.textSecondary,
              marginBottom: SP,
              marginLeft: 4,
            }}
          >
            Restrictions
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SP }}>
            {[
              "Végétarien",
              "Végan",
              "Sans gluten",
              "Sans lactose",
              "Halal",
              "Sans porc",
            ].map((item) => (
              <OptionPill
                key={item}
                label={item}
                active={dietary.includes(item)}
                onPress={() => toggleDietary(item)}
                C={C}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Generate button */}
      <Pressable
        onPress={handleGenerate}
        style={({ pressed }) => ({
          marginTop: SP * 3,
          backgroundColor: C.accent,
          borderRadius: RADIUS_INNER,
          paddingVertical: SP * 2,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: SP * 1.25,
          minHeight: 52,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
        accessibilityLabel="Générer ma routine"
      >
        <Ionicons name="sparkles" size={20} color={C.card} />
        <Text style={{ fontSize: 17, fontWeight: "700", color: C.card }}>
          Générer ma routine
        </Text>
      </Pressable>
    </ScrollView>
  );
}


function GeneratingState({ C }: { C: any }) {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: SP * 2,
        paddingHorizontal: SP * 5,
      }}
    >
      <Animated.View style={{ opacity: pulseAnim }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            backgroundColor: C.accent + "18",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: SP,
          }}
        >
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </Animated.View>

      <Text
        style={{
          fontSize: 17,
          fontWeight: "700",
          color: C.textPrimary,
        }}
      >
        Generation en cours...
      </Text>

      <Text
        style={{
          fontSize: 14,
          color: C.textSecondary,
          textAlign: "center",
          lineHeight: 21,
        }}
      >
        On prepare votre plan repas personnalise pour la semaine
      </Text>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: {
    elevation: 4,
  },
  default: {},
}) as any;


function RegenOptions({
  C,
  onGenerate,
  onCancel,
}: {
  C: any;
  onGenerate: (options: RoutineOptions) => void;
  onCancel: () => void;
}) {
  const [snacks, setSnacks] = useState(false);
  const [budget, setBudget] = useState<"low" | "medium" | "high">("medium");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">(
    "beginner",
  );
  const [dietary, setDietary] = useState<string[]>([]);

  const toggleDietary = (item: string) => {
    setDietary((prev) =>
      prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item],
    );
  };

  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: RADIUS_CARD,
        padding: SP * 2.5,
        borderWidth: 1,
        borderColor: C.border,
        gap: SP * 2,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700", color: C.textPrimary }}>
        Options de régénération
      </Text>

      <OptionToggle
        label="Inclure des encas"
        icon="cafe-outline"
        active={snacks}
        onPress={() => setSnacks(!snacks)}
        C={C}
      />

      <View>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: C.textSecondary,
            marginBottom: 6,
            marginLeft: 4,
          }}
        >
          Budget
        </Text>
        <View style={{ flexDirection: "row", gap: SP }}>
          {(
            [
              ["low", "Serré"],
              ["medium", "Normal"],
              ["high", "Confort"],
            ] as const
          ).map(([key, label]) => (
            <OptionPill
              key={key}
              label={label}
              active={budget === key}
              onPress={() => setBudget(key)}
              C={C}
            />
          ))}
        </View>
      </View>

      <View>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: C.textSecondary,
            marginBottom: 6,
            marginLeft: 4,
          }}
        >
          Niveau
        </Text>
        <View style={{ flexDirection: "row", gap: SP }}>
          {(
            [
              ["beginner", "Débutant"],
              ["intermediate", "Inter."],
              ["advanced", "Avancé"],
            ] as const
          ).map(([key, label]) => (
            <OptionPill
              key={key}
              label={label}
              active={level === key}
              onPress={() => setLevel(key)}
              C={C}
            />
          ))}
        </View>
      </View>

      <View>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: C.textSecondary,
            marginBottom: 6,
            marginLeft: 4,
          }}
        >
          Restrictions
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SP }}>
          {[
            "Végétarien",
            "Végan",
            "Sans gluten",
            "Sans lactose",
            "Halal",
            "Sans porc",
          ].map((item) => (
            <OptionPill
              key={item}
              label={item}
              active={dietary.includes(item)}
              onPress={() => toggleDietary(item)}
              C={C}
            />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: SP * 1.5, marginTop: SP }}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 14,
            borderRadius: RADIUS_PILL,
            backgroundColor: C.background,
            borderWidth: 1,
            borderColor: C.border,
            alignItems: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{ fontSize: 14, fontWeight: "600", color: C.textSecondary }}
          >
            Annuler
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            onGenerate({
              includeSnacks: snacks,
              budget,
              cookingLevel: level,
              dietary: dietary.length > 0 ? dietary : undefined,
            })
          }
          style={({ pressed }) => ({
            flex: 2,
            paddingVertical: 14,
            borderRadius: RADIUS_PILL,
            backgroundColor: C.accent,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Ionicons name="sparkles" size={16} color={C.card} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.card }}>
            Régénérer
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
