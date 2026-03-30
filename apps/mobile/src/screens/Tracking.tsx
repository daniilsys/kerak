import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Animated,
  ActivityIndicator,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getDaySummary, getDayLogs, addFoodLog, updateFoodLog, deleteFoodLog, searchIngredients, quickLogParse, quickLogConfirm } from "../utils/api";
import { saveRecentMeal, getRecentMeals } from "../utils/storage";
import { useTheme } from "../theme/ThemeContext";
import { useStaggerFade } from "../hooks/useAnimations";
import { useDebounce } from "../hooks/useDebounce";
import { IconButton } from "../components/IconButton";
import CalendarTracking from "./CalendarTracking";
import WeeklyRoutine from "./WeeklyRoutine";
import NutritionAnalysis from "./NutritionAnalysis";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MEALS = [
  { key: "breakfast", label: "Petit-déjeuner", icon: "sunny-outline" as const },
  { key: "lunch", label: "Déjeuner", icon: "restaurant-outline" as const },
  { key: "dinner", label: "Dîner", icon: "moon-outline" as const },
  { key: "snack", label: "Snack", icon: "cafe-outline" as const },
];

function todayStr() {
  const now = new Date();
  if (now.getHours() < 5) {
    now.setDate(now.getDate() - 1);
  }
  return now.toISOString().slice(0, 10);
}

function formatDateFrench(dateStr?: string | null): string {
  const now = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
  if (!dateStr && now.getHours() < 5) {
    now.setDate(now.getDate() - 1);
  }
  const days = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
}

import Svg, { Circle } from "react-native-svg";

const RING_SIZE = 160;
const STROKE_WIDTH = 12;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getColor(total: number, target: number, C: any): string {
  if (target <= 0) return C.paleOak;
  const ratio = total / target;
  if (ratio <= 1.0) return C.primary;
  if (ratio < 1.1) return C.accent;
  if (ratio < 1.25) return "#E07A5F";
  return C.error;
}

function CalorieRing({
  total,
  target,
}: {
  total: number;
  target: number;
}) {
  const { C } = useTheme();
  const pct = target > 0 ? Math.min(total / target, 1) : 0;
  const remaining = Math.max(target - total, 0);
  const color = getColor(total, target, C);

  const animVal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, {
      toValue: pct,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const [dashOffset, setDashOffset] = useState(CIRCUMFERENCE);
  useEffect(() => {
    const id = animVal.addListener(({ value }) => {
      setDashOffset(CIRCUMFERENCE * (1 - value));
    });
    return () => animVal.removeListener(id);
  }, []);

  const displayAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    displayAnim.setValue(0);
    Animated.timing(displayAnim, {
      toValue: total,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [total]);

  const [shownTotal, setShownTotal] = useState(0);
  useEffect(() => {
    const id = displayAnim.addListener(({ value }) =>
      setShownTotal(Math.round(value)),
    );
    return () => displayAnim.removeListener(id);
  }, []);

  return (
    <View style={{ alignItems: "center", paddingVertical: 20 }}>
      <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" }}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: "absolute" }}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={C.paleOak + "25"}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <Text style={{ fontSize: 32, fontWeight: "800", color: C.primaryDark }}>
          {shownTotal}
        </Text>
        <Text style={{ fontSize: 13, color: C.greyOlive }}>/ {target} kcal</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: "600", color, marginTop: 12 }}>
        {total > target
          ? `${total - target} kcal en trop`
          : `${remaining} kcal restantes`}
      </Text>
    </View>
  );
}

function MealBreakdown({
  byMeal,
}: {
  byMeal: Record<string, number>;
}) {
  const { C } = useTheme();
  const hasMeals = MEALS.some((m) => byMeal[m.key]);
  if (!hasMeals) return null;

  return (
    <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
      {MEALS.filter((m) => byMeal[m.key]).map((m) => (
        <View
          key={m.key}
          style={{
            flex: 1,
            backgroundColor: C.white,
            borderRadius: 12,
            padding: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: C.paleOak + "15",
          }}
        >
          <Ionicons name={m.icon} size={16} color={C.accent} />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: C.primaryDark,
              marginTop: 4,
            }}
          >
            {byMeal[m.key]}
          </Text>
          <Text style={{ fontSize: 10, color: C.paleOak }}>kcal</Text>
        </View>
      ))}
    </View>
  );
}

function MealSelector({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (key: string) => void;
}) {
  const { C } = useTheme();
  const indicatorX = useRef(new Animated.Value(0)).current;
  const selectedIndex = MEALS.findIndex((m) => m.key === selected);
  const [itemWidth, setItemWidth] = useState(0);

  useEffect(() => {
    if (itemWidth > 0) {
      Animated.spring(indicatorX, {
        toValue: selectedIndex * (itemWidth + 6),
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }).start();
    }
  }, [selectedIndex, itemWidth]);

  return (
    <View
      style={{ flexDirection: "row", gap: 6, position: "relative" }}
      onLayout={(e) => {
        const totalWidth = e.nativeEvent.layout.width;
        setItemWidth((totalWidth - 18) / 4);
      }}
    >
      {itemWidth > 0 && (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: itemWidth,
            height: "100%",
            borderRadius: 10,
            backgroundColor: C.accent + "18",
            borderWidth: 1.5,
            borderColor: C.accent,
            transform: [{ translateX: indicatorX }],
          }}
        />
      )}
      {MEALS.map((m) => (
        <Pressable
          key={m.key}
          onPress={() => onSelect(m.key)}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Ionicons
            name={m.icon}
            size={18}
            color={selected === m.key ? C.accent : C.paleOak}
          />
          <Text
            style={{
              fontSize: 10,
              fontWeight: "600",
              marginTop: 2,
              color: selected === m.key ? C.accent : C.paleOak,
            }}
          >
            {m.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

interface SelectedFood {
  id: string;
  name: string;
  caloriesPer100g: number;
}

function QuantitySheet({
  food,
  meal,
  onAdd,
  onClose,
}: {
  food: SelectedFood;
  meal: string;
  onAdd: (meal: string, label: string, kcal: number, extra?: { ingredientId?: string; grams?: number }) => void;
  onClose: () => void;
}) {
  const { C } = useTheme();
  const [grams, setGrams] = useState("100");
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const gramsNum = parseInt(grams, 10) || 0;
  const calculatedKcal = Math.round((food.caloriesPer100g * gramsNum) / 100);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 300, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleAdd = () => {
    if (gramsNum <= 0) return;
    onAdd(meal, food.name, calculatedKcal, { ingredientId: food.id, grams: gramsNum });
    dismiss();
  };

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
      <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#00000050", opacity: backdropOpacity }}>
        <Pressable style={{ flex: 1 }} onPress={dismiss} />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: C.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          paddingBottom: 40,
          transform: [{ translateY: slideAnim }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.paleOak + "40", marginBottom: 20 }} />

        <Text style={{ fontSize: 18, fontWeight: "700", color: C.textPrimary, marginBottom: 4 }}>
          {food.name}
        </Text>
        <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>
          {food.caloriesPer100g} kcal pour 100g
        </Text>

        <Text style={{ fontSize: 13, fontWeight: "600", color: C.textSecondary, marginBottom: 8, marginLeft: 4 }}>
          Quantité (g)
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: C.background,
            borderRadius: 12,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: 16,
          }}
        >
          <Ionicons name="scale-outline" size={18} color={C.paleOak} />
          <TextInput
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 10,
              fontSize: 18,
              fontWeight: "600",
              color: C.textPrimary,
            }}
            value={grams}
            onChangeText={setGrams}
            keyboardType="number-pad"
            selectTextOnFocus
            autoFocus
          />
          <Text style={{ fontSize: 15, color: C.textSecondary }}>g</Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: C.accent + "12",
            borderRadius: 12,
            padding: 16,
            gap: 8,
            marginBottom: 20,
          }}
        >
          <Ionicons name="flame" size={20} color={C.accent} />
          <Text style={{ fontSize: 24, fontWeight: "800", color: C.accent }}>
            {calculatedKcal}
          </Text>
          <Text style={{ fontSize: 15, color: C.accent, fontWeight: "500" }}>kcal</Text>
        </View>

        <Pressable
          onPress={handleAdd}
          disabled={gramsNum <= 0}
          style={({ pressed }) => ({
            backgroundColor: C.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: gramsNum <= 0 ? 0.4 : pressed ? 0.85 : 1,
            transform: [{ scale: pressed && gramsNum > 0 ? 0.97 : 1 }],
          })}
        >
          <Ionicons name="add-circle-outline" size={20} color={C.white} />
          <Text style={{ fontSize: 17, fontWeight: "700", color: C.white }}>
            Ajouter au suivi
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const QUICK_PRESETS = [
  { label: "Café", icon: "cafe-outline" as const, kcal: 5 },
  { label: "Fruit", icon: "nutrition-outline" as const, kcal: 80 },
  { label: "Snack", icon: "fast-food-outline" as const, kcal: 200 },
  { label: "Sandwich", icon: "restaurant-outline" as const, kcal: 400 },
  { label: "Plat", icon: "pizza-outline" as const, kcal: 600 },
  { label: "Repas copieux", icon: "beer-outline" as const, kcal: 900 },
];

function ManualSheet({
  meal,
  initialName,
  onAdd,
  onClose,
}: {
  meal: string;
  initialName: string;
  onAdd: (meal: string, label: string, kcal: number) => void;
  onClose: () => void;
}) {
  const { C } = useTheme();
  const [name, setName] = useState(initialName);
  const [kcal, setKcal] = useState("");
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const kcalNum = parseInt(kcal, 10) || 0;
  const canAdd = name.trim().length > 0 && kcalNum > 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 300, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd(meal, name.trim(), kcalNum);
    dismiss();
  };

  const applyPreset = (preset: typeof QUICK_PRESETS[number]) => {
    if (!name.trim()) setName(preset.label);
    setKcal(preset.kcal.toString());
  };

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
      <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#00000050", opacity: backdropOpacity }}>
        <Pressable style={{ flex: 1 }} onPress={dismiss} />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: C.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          paddingBottom: 40,
          transform: [{ translateY: slideAnim }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.paleOak + "40", marginBottom: 16 }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.accent + "15", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="create-outline" size={18} color={C.accent} />
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: C.textPrimary }}>Saisie libre</Text>
            <Text style={{ fontSize: 12, color: C.textSecondary }}>Ajoutez un repas manuellement</Text>
          </View>
        </View>

        <Text style={{ fontSize: 12, fontWeight: "600", color: C.textSecondary, marginBottom: 8, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Estimation rapide
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {QUICK_PRESETS.map((preset) => {
            const isActive = kcal === preset.kcal.toString();
            return (
              <Pressable
                key={preset.label}
                onPress={() => applyPreset(preset)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: isActive ? C.accent + "18" : C.background,
                  borderWidth: 1,
                  borderColor: isActive ? C.accent + "40" : C.border,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name={preset.icon} size={14} color={isActive ? C.accent : C.textSecondary} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: isActive ? C.accent : C.textPrimary }}>
                  {preset.label}
                </Text>
                <Text style={{ fontSize: 11, color: isActive ? C.accent : C.textSecondary }}>
                  ~{preset.kcal}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={{ fontSize: 12, fontWeight: "600", color: C.textSecondary, marginBottom: 6, marginLeft: 4 }}>
          Aliment
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: C.background,
            borderRadius: 12,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: name.trim() ? C.primary + "40" : C.border,
            marginBottom: 12,
          }}
        >
          <Ionicons name="restaurant-outline" size={16} color={C.paleOak} />
          <TextInput
            style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 16, color: C.textPrimary }}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Sandwich, Salade..."
            placeholderTextColor={C.paleOak}
            autoFocus={!initialName}
          />
          {name.length > 0 && (
            <Pressable onPress={() => setName("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={C.paleOak} />
            </Pressable>
          )}
        </View>

        <Text style={{ fontSize: 12, fontWeight: "600", color: C.textSecondary, marginBottom: 6, marginLeft: 4 }}>
          Calories
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: C.background,
            borderRadius: 12,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: kcalNum > 0 ? C.accent + "40" : C.border,
            marginBottom: 6,
          }}
        >
          <Ionicons name="flame-outline" size={16} color={C.accent} />
          <TextInput
            style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 18, fontWeight: "600", color: C.textPrimary }}
            value={kcal}
            onChangeText={setKcal}
            placeholder="0"
            placeholderTextColor={C.paleOak}
            keyboardType="number-pad"
            autoFocus={!!initialName}
            selectTextOnFocus
          />
          <Text style={{ fontSize: 14, color: C.textSecondary }}>kcal</Text>
        </View>
        <Text style={{ fontSize: 11, color: C.paleOak, marginLeft: 4, marginBottom: 16 }}>
          Astuce : un repas moyen fait environ 500-700 kcal
        </Text>

        <Pressable
          onPress={handleAdd}
          disabled={!canAdd}
          style={({ pressed }) => ({
            backgroundColor: C.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: !canAdd ? 0.4 : pressed ? 0.85 : 1,
            transform: [{ scale: pressed && canAdd ? 0.97 : 1 }],
          })}
        >
          <Ionicons name="add-circle-outline" size={20} color={C.white} />
          <Text style={{ fontSize: 17, fontWeight: "700", color: C.white }}>
            Ajouter au suivi
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function QuickLogSheet({
  items: initialItems,
  meal,
  date,
  onConfirm,
  onClose,
}: {
  items: { label: string; calories: number; proteins: number; carbs: number; fats: number; fiber: number }[];
  meal: string;
  date: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { C } = useTheme();
  const [items, setItems] = useState(initialItems);
  const [confirming, setConfirming] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const total = items.reduce((s, i) => s + i.calories, 0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 400, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const updateCalories = (index: number, val: string) => {
    const num = parseInt(val, 10) || 0;
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, calories: num } : it)));
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await quickLogConfirm(items, meal, date);
      for (const item of items) {
        await saveRecentMeal({ label: item.label, calories: item.calories });
      }
      dismiss();
      setTimeout(() => onConfirm(), 200);
    } catch {
      setConfirming(false);
    }
  };

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
      <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#00000050", opacity: backdropOpacity }}>
        <Pressable style={{ flex: 1 }} onPress={dismiss} />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: C.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          paddingBottom: 40,
          transform: [{ translateY: slideAnim }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
          maxHeight: "70%",
        }}
      >
        <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.paleOak + "40", marginBottom: 16 }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.accent + "15", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="sparkles" size={18} color={C.accent} />
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: C.textPrimary }}>On a trouvé !</Text>
            <Text style={{ fontSize: 12, color: C.textSecondary }}>Vérifiez et ajustez si besoin</Text>
          </View>
        </View>

        <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
          {items.map((item, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: C.border,
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: C.textPrimary }}>{item.label}</Text>
                <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
                  P {item.proteins}g · G {item.carbs}g · L {item.fats}g
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: C.background,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <TextInput
                  style={{ fontSize: 16, fontWeight: "600", color: C.accent, paddingVertical: 8, minWidth: 40, textAlign: "right" }}
                  value={item.calories.toString()}
                  onChangeText={(val) => updateCalories(i, val)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  accessibilityLabel={`Calories pour ${item.label}`}
                />
                <Text style={{ fontSize: 12, color: C.textSecondary, marginLeft: 4 }}>kcal</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: C.accent + "12",
            borderRadius: 12,
            padding: 14,
            gap: 8,
            marginTop: 12,
            marginBottom: 16,
          }}
        >
          <Ionicons name="flame" size={18} color={C.accent} />
          <Text style={{ fontSize: 20, fontWeight: "800", color: C.accent }}>{total}</Text>
          <Text style={{ fontSize: 14, color: C.accent, fontWeight: "500" }}>kcal au total</Text>
        </View>

        <Pressable
          onPress={handleConfirm}
          disabled={confirming || total <= 0}
          accessibilityLabel="Confirmer l'ajout des repas"
          accessibilityRole="button"
          style={({ pressed }) => ({
            backgroundColor: C.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: confirming || total <= 0 ? 0.4 : pressed ? 0.85 : 1,
            transform: [{ scale: pressed && !confirming && total > 0 ? 0.97 : 1 }],
          })}
        >
          {confirming ? (
            <ActivityIndicator size="small" color={C.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
              <Text style={{ fontSize: 17, fontWeight: "700", color: C.white }}>Confirmer</Text>
            </>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

function QuickLogInput({
  meal,
  date,
  onAdd,
  onRefresh,
  onParsed,
}: {
  meal: string;
  date: string;
  onAdd: (meal: string, label: string, calories: number) => void;
  onRefresh: () => void;
  onParsed: (items: any[], mealType: string) => void;
}) {
  const { C } = useTheme();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [recentMeals, setRecentMeals] = useState<{ label: string; calories: number }[]>([]);

  useEffect(() => {
    getRecentMeals().then(setRecentMeals).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || parsing) return;
    setParsing(true);
    try {
      const result = await quickLogParse(trimmed, date);
      if (result.items && result.items.length > 0) {
        onParsed(result.items, result.mealType ?? meal);
        setText("");
      }
    } catch {
    } finally {
      setParsing(false);
    }
  };

  const handleRecentTap = (item: { label: string; calories: number }) => {
    onAdd(meal, item.label, item.calories);
  };

  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: C.accent + "15", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="sparkles" size={14} color={C.accent} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: "700", color: C.textPrimary }}>
            Ajout rapide
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: C.background,
            borderRadius: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Ionicons name="chatbubble-outline" size={16} color={C.paleOak} />
          <TextInput
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 8,
              fontSize: 15,
              color: C.textPrimary,
            }}
            value={text}
            onChangeText={setText}
            placeholder="Qu'est-ce que tu as mangé ?"
            placeholderTextColor={C.paleOak}
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
            editable={!parsing}
            accessibilityLabel="Décris ce que tu as mangé"
          />
          {parsing ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            text.trim().length > 0 && (
              <Pressable
                onPress={handleSubmit}
                hitSlop={8}
                accessibilityLabel="Analyser le repas"
                accessibilityRole="button"
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: C.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                })}
              >
                <Ionicons name="arrow-up" size={18} color={C.white} />
              </Pressable>
            )
          )}
        </View>

        {recentMeals.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Récents
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {recentMeals.slice(0, 6).map((item, i) => (
                <Pressable
                  key={`${item.label}-${i}`}
                  onPress={() => handleRecentTap(item)}
                  accessibilityLabel={`Ajouter ${item.label}, ${item.calories} calories`}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: pressed ? C.accent + "15" : C.background,
                    borderWidth: 1,
                    borderColor: pressed ? C.accent + "30" : C.border,
                    maxWidth: 180,
                  })}
                >
                  <Text style={{ fontSize: 12, fontWeight: "500", color: C.textPrimary }} numberOfLines={1} ellipsizeMode="tail">
                    {item.label.length > 20 ? item.label.slice(0, 18) + "…" : item.label}
                  </Text>
                  <Text style={{ fontSize: 10, color: C.accent, fontWeight: "600" }}>
                    {item.calories}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
    </View>
  );
}

function AddMealForm({
  onAdd,
}: {
  onAdd: (meal: string, label: string, kcal: number, extra?: { ingredientId?: string; grams?: number }) => void;
}) {
  const { C } = useTheme();
  const [selectedMeal, setSelectedMeal] = useState("lunch");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    { id: string; name: string; calories: number | null }[]
  >([]);
  const [sheetFood, setSheetFood] = useState<SelectedFood | null>(null);
  const [showManual, setShowManual] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    searchIngredients(debouncedQuery).then((results) => {
      if (cancelled) return;
      setSuggestions(
        results
          .filter((r) => r.calories != null)
          .slice(0, 6)
          .map((r) => ({ id: r.id, name: r.name, calories: r.calories })),
      );
    });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const selectSuggestion = (item: { id: string; name: string; calories: number | null }) => {
    setSheetFood({
      id: item.id,
      name: item.name,
      caloriesPer100g: Math.round(item.calories ?? 0),
    });
    setQuery("");
    setSuggestions([]);
  };

  const showSuggestions = suggestions.length > 0 && query.length >= 2;

  return (
    <>
      <View
        style={{
          backgroundColor: C.card,
          borderRadius: 16,
          padding: 16,
          gap: 12,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: C.textPrimary }}>
          Ajouter un repas
        </Text>

        <MealSelector selected={selectedMeal} onSelect={setSelectedMeal} />

        <View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: C.background,
              borderRadius: 10,
              paddingHorizontal: 12,
              borderWidth: showSuggestions ? 1.5 : 0,
              borderColor: C.accent,
            }}
          >
            <Ionicons name="search-outline" size={16} color={C.paleOak} />
            <TextInput
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 8,
                fontSize: 15,
                color: C.textPrimary,
              }}
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher un aliment..."
              placeholderTextColor={C.paleOak}
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => { setQuery(""); setSuggestions([]); }}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color={C.paleOak} />
              </Pressable>
            )}
          </View>

          {showSuggestions && (
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 10,
                marginTop: 4,
                borderWidth: 1,
                borderColor: C.border,
                overflow: "hidden",
              }}
            >
              {suggestions.map((item, i) => (
                <Pressable
                  key={item.id}
                  onPress={() => selectSuggestion(item)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 11,
                    paddingHorizontal: 12,
                    backgroundColor: pressed ? C.accent + "10" : "transparent",
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: C.border,
                  })}
                >
                  <Text
                    style={{ flex: 1, fontSize: 14, color: C.textPrimary }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {item.calories != null && (
                    <View
                      style={{
                        backgroundColor: C.accent + "15",
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        marginLeft: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: C.accent }}>
                        {Math.round(item.calories)} kcal/100g
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Pressable
          onPress={() => setShowManual(query || "")}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 10,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="create-outline" size={16} color={C.textSecondary} />
          <Text style={{ fontSize: 13, color: C.textSecondary }}>
            Introuvable ? Saisie libre
          </Text>
        </Pressable>
      </View>

      {sheetFood && (
        <QuantitySheet
          food={sheetFood}
          meal={selectedMeal}
          onAdd={onAdd}
          onClose={() => setSheetFood(null)}
        />
      )}

      {showManual !== null && (
        <ManualSheet
          meal={selectedMeal}
          initialName={showManual}
          onAdd={onAdd}
          onClose={() => setShowManual(null)}
        />
      )}
    </>
  );
}

function EditLogSheet({
  log,
  onSave,
  onClose,
}: {
  log: any;
  onSave: (id: string, label: string, calories: number) => void;
  onClose: () => void;
}) {
  const { C } = useTheme();
  const [label, setLabel] = useState(log.label);
  const [kcal, setKcal] = useState(log.calories.toString());
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const kcalNum = parseInt(kcal, 10) || 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 300, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleSave = () => {
    if (!label.trim() || kcalNum <= 0) return;
    onSave(log.id, label.trim(), kcalNum);
    dismiss();
  };

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
      <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#00000050", opacity: backdropOpacity }}>
        <Pressable style={{ flex: 1 }} onPress={dismiss} />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: C.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          paddingBottom: 40,
          transform: [{ translateY: slideAnim }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.paleOak + "40", marginBottom: 20 }} />

        <Text style={{ fontSize: 18, fontWeight: "700", color: C.textPrimary, marginBottom: 16 }}>
          Modifier
        </Text>

        <Text style={{ fontSize: 13, fontWeight: "600", color: C.textSecondary, marginBottom: 8, marginLeft: 4 }}>
          Aliment
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: C.background,
            borderRadius: 12,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: 14,
          }}
        >
          <Ionicons name="restaurant-outline" size={18} color={C.paleOak} />
          <TextInput
            style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 16, color: C.textPrimary }}
            value={label}
            onChangeText={setLabel}
          />
        </View>

        <Text style={{ fontSize: 13, fontWeight: "600", color: C.textSecondary, marginBottom: 8, marginLeft: 4 }}>
          Calories
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: C.background,
            borderRadius: 12,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: 20,
          }}
        >
          <Ionicons name="flame-outline" size={18} color={C.accent} />
          <TextInput
            style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 18, fontWeight: "600", color: C.textPrimary }}
            value={kcal}
            onChangeText={setKcal}
            keyboardType="number-pad"
          />
          <Text style={{ fontSize: 15, color: C.textSecondary }}>kcal</Text>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={!label.trim() || kcalNum <= 0}
          style={({ pressed }) => ({
            backgroundColor: C.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: !label.trim() || kcalNum <= 0 ? 0.4 : pressed ? 0.85 : 1,
          })}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
          <Text style={{ fontSize: 17, fontWeight: "700", color: C.white }}>
            Enregistrer
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function AnimatedLogItem({
  log,
  isNew,
  onDelete,
  onEdit,
}: {
  log: any;
  isNew: boolean;
  onDelete: (id: string) => void;
  onEdit: (log: any) => void;
}) {
  const { C } = useTheme();
  const fadeAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(isNew ? 40 : 0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const mealInfo = MEALS.find((m) => m.key === log.meal);

  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 2, duration: 30, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
    ]).start();
  };

  const handleLongPress = () => {
    shake();
    Alert.alert(
      log.label,
      `${log.calories} kcal`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Modifier",
          onPress: () => onEdit(log),
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirmer la suppression",
              `Supprimer "${log.label}" du suivi ?`,
              [
                { text: "Annuler", style: "cancel" },
                {
                  text: "Supprimer",
                  style: "destructive",
                  onPress: () => onDelete(log.id),
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <Pressable onLongPress={handleLongPress} delayLongPress={400}>
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: C.card,
          borderRadius: 12,
          padding: 14,
          gap: 12,
          borderWidth: 1,
          borderColor: C.border,
          opacity: fadeAnim,
          transform: [{ translateX: Animated.add(slideAnim, shakeAnim) }],
        }}
      >
        <Ionicons
          name={mealInfo?.icon ?? "restaurant-outline"}
          size={18}
          color={C.teal}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, color: C.textPrimary }}>
            {log.label}
          </Text>
          {log.createdAt && (
            <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
              {new Date(log.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 14, fontWeight: "600", color: C.accent }}>
          {log.calories} kcal
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function EmptyState() {
  const { C } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: 32,
        paddingHorizontal: 20,
      }}
    >
      <Animated.View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: C.paleOak + "15",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          transform: [{ scale: pulseAnim }],
        }}
      >
        <Ionicons name="restaurant-outline" size={36} color={C.paleOak} />
      </Animated.View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: C.primaryDark,
          textAlign: "center",
          marginBottom: 6,
        }}
      >
        Aucun repas enregistré aujourd'hui
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: C.paleOak,
          textAlign: "center",
        }}
      >
        Ajoutez votre premier repas ci-dessous
      </Text>
    </View>
  );
}

function SuccessToast({ visible, message = "Repas ajouté" }: { visible: boolean; message?: string }) {
  const { C } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start();
        }, 1000);
      });
    } else {
      opacity.setValue(0);
      scale.setValue(0.5);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 60,
        alignSelf: "center",
        backgroundColor: C.success,
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        opacity,
        transform: [{ scale }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 100,
      }}
    >
      <Ionicons name="checkmark-circle" size={20} color={C.white} />
      <Text style={{ fontSize: 14, fontWeight: "600", color: C.white }}>
        {message}
      </Text>
    </Animated.View>
  );
}

export default function Tracking() {
  const { C } = useTheme();
  const [summary, setSummary] = useState<{
    target: number;
    total: number;
    byMeal: Record<string, number>;
  } | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showRoutine, setShowRoutine] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [viewDate, setViewDate] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [quickLogItems, setQuickLogItems] = useState<any[] | null>(null);
  const [quickLogMeal, setQuickLogMeal] = useState("lunch");

  const date = viewDate ?? todayStr();

  const refresh = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([getDaySummary(date), getDayLogs(date)]);
      setSummary(s);
      setLogs(l.logs || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const handleDelete = async (id: string) => {
    try {
      await deleteFoodLog(id);
      setToastMessage("Repas supprimé");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);
      await refresh();
    } catch {}
  };

  const handleEdit = async (id: string, label: string, calories: number) => {
    try {
      await updateFoodLog(id, { label, calories });
      setToastMessage("Repas modifié");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);
      await refresh();
    } catch {}
  };

  const handleAdd = async (meal: string, label: string, calories: number, extra?: { ingredientId?: string; grams?: number }) => {
    try {
      await addFoodLog({ date, meal, label, calories, ...extra });

      setToastMessage("Repas ajouté");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);

      const [s, l] = await Promise.all([getDaySummary(date), getDayLogs(date)]);
      const newLogs: any[] = l.logs || [];
      const existingIds = new Set(logs.map((lg: any) => lg.id));
      const addedIds = new Set(
        newLogs
          .filter((lg: any) => !existingIds.has(lg.id))
          .map((lg: any) => lg.id)
      );
      setNewLogIds(addedIds);
      setSummary(s);
      setLogs(newLogs);

      setTimeout(() => setNewLogIds(new Set()), 500);
    } catch {
    }
  };

  const currentMeal = (() => {
    const h = new Date().getHours();
    if (h < 10) return "breakfast";
    if (h < 15) return "lunch";
    if (h < 18) return "snack";
    return "dinner";
  })();

  const staggers = useStaggerFade(4, 150);

  const contentFade = useRef(new Animated.Value(1)).current;
  const calendarFade = useRef(new Animated.Value(0)).current;

  const openCalendar = () => {
    Animated.timing(contentFade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setShowCalendar(true);
      Animated.timing(calendarFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const closeCalendar = (selectedDate?: string) => {
    Animated.timing(calendarFade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      const isToday = selectedDate === todayStr();
      setViewDate(selectedDate && !isToday ? selectedDate : null);
      setShowCalendar(false);
      contentFade.setValue(0);
      Animated.timing(contentFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  if (showCalendar) {
    return (
      <Animated.View style={{ flex: 1, opacity: calendarFade }}>
        <CalendarTracking
          onBack={() => closeCalendar()}
          onSelectDate={(d) => closeCalendar(d)}
        />
      </Animated.View>
    );
  }

  if (showNutrition) {
    return <NutritionAnalysis onBack={() => setShowNutrition(false)} />;
  }

  if (showRoutine) {
    return <WeeklyRoutine onBack={() => setShowRoutine(false)} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={["top"]}>
      <SuccessToast visible={showToast} message={toastMessage} />

      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingVertical: 12,
          opacity: contentFade,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 28, fontWeight: "800", color: C.textPrimary }}
          >
            {viewDate ? "Suivi" : "Suivi du jour"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
            <Text style={{ fontSize: 14, color: C.textSecondary }}>
              {formatDateFrench(viewDate)}
            </Text>
            {viewDate && viewDate !== todayStr() && (
              <Pressable
                onPress={() => setViewDate(null)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: C.accent + "15",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 20,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="today-outline" size={14} color={C.accent} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: C.accent }}>
                  Aujourd'hui
                </Text>
              </Pressable>
            )}
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <IconButton
            icon="nutrition-outline"
            onPress={() => setShowNutrition(true)}
            iconSize={18}
            size={36}
            color={C.teal}
            bg={C.teal + "18"}
          />
          <IconButton
            icon="restaurant-outline"
            onPress={() => setShowRoutine(true)}
            iconSize={18}
            size={36}
            color={C.primary}
            bg={C.primary + "18"}
          />
          <IconButton
            icon="calendar-outline"
            onPress={openCalendar}
            iconSize={18}
            size={36}
            color={C.accent}
            bg={C.accent + "18"}
          />
        </View>
      </Animated.View>

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 100,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <Animated.View style={staggers[0]}>
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <CalorieRing
                total={summary?.total ?? 0}
                target={summary?.target ?? 2000}
              />

              {summary && Object.keys(summary.byMeal).length > 0 && (
                <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border }}>
                  <MealBreakdown byMeal={summary.byMeal} />
                </View>
              )}
            </View>
          </Animated.View>

          <Animated.View style={staggers[1]}>
            <QuickLogInput
              meal={currentMeal}
              date={date}
              onAdd={handleAdd}
              onRefresh={refresh}
              onParsed={(items, mealType) => { setQuickLogMeal(mealType); setQuickLogItems(items); }}
            />
          </Animated.View>

          <Animated.View style={staggers[2]}>
            <AddMealForm onAdd={handleAdd} />
          </Animated.View>

          <Animated.View style={staggers[3]}>
            {logs.length > 0 ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: C.teal + "15", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="list-outline" size={13} color={C.teal} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: C.textPrimary }}>
                    {viewDate && viewDate !== todayStr() ? formatDateFrench(viewDate) : "Aujourd'hui"}
                  </Text>
                  <Text style={{ fontSize: 13, color: C.textSecondary }}>
                    {logs.length} repas
                  </Text>
                </View>
                {logs.map((log: any) => (
                  <AnimatedLogItem
                    key={log.id}
                    log={log}
                    isNew={newLogIds.has(log.id)}
                    onDelete={handleDelete}
                    onEdit={(l: any) => setEditingLog(l)}
                  />
                ))}
              </View>
            ) : (
              <EmptyState />
            )}
          </Animated.View>
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      {editingLog && (
        <EditLogSheet
          log={editingLog}
          onSave={(id, label, calories) => {
            setEditingLog(null);
            handleEdit(id, label, calories);
          }}
          onClose={() => setEditingLog(null)}
        />
      )}

      {quickLogItems && (
        <QuickLogSheet
          items={quickLogItems}
          meal={quickLogMeal}
          date={date}
          onConfirm={() => {
            setQuickLogItems(null);
            refresh();
          }}
          onClose={() => setQuickLogItems(null)}
        />
      )}
    </SafeAreaView>
  );
}
