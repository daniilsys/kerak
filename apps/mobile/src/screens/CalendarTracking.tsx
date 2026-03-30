import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { getLogsRange } from "../utils/api";
import { IconButton } from "../components/IconButton";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

interface Props {
  onBack: () => void;
  onSelectDate?: (date: string) => void;
}

function todayStr() {
  const now = new Date();
  if (now.getHours() < 5) now.setDate(now.getDate() - 1);
  return now.toISOString().slice(0, 10);
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
  delay,
  C,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  unit: string;
  color: string;
  delay: number;
  C: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, delay, useNativeDriver: true, damping: 15, stiffness: 150,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: C.border,
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <View
        style={{
          width: 32, height: 32, borderRadius: 10,
          backgroundColor: color + "15",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: "500" }}>
        {label}
      </Text>
      <Text style={{ fontSize: 22, fontWeight: "800", color: C.textPrimary }}>
        {value.toLocaleString("fr-FR")}
      </Text>
      <Text style={{ fontSize: 11, color: C.textSecondary }}>{unit}</Text>
    </Animated.View>
  );
}

export default function CalendarTracking({ onBack, onSelectDate }: Props) {
  const { C } = useTheme();
  const today = todayStr();
  const todayDate = new Date(today + "T12:00:00");

  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());
  const [dayData, setDayData] = useState<
    Record<string, { total: number; target: number }>
  >({});
  const [loading, setLoading] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [weeklyLabels, setWeeklyLabels] = useState<string[]>(["", "", "", "", "", "", ""]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const headerFade = useRef(new Animated.Value(0)).current;
  const calFade = useRef(new Animated.Value(0)).current;
  const chartFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(headerFade, { toValue: 1, duration: 350, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(calFade, { toValue: 1, duration: 350, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(chartFade, { toValue: 1, duration: 350, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, []);

  const fetchMonthData = useCallback(async () => {
    if (hasLoadedOnce.current) setLoading(true);
    try {
      const from = `${year}-${pad(month + 1)}-01`;
      const lastDay = new Date(year, month + 1, 0);
      const to = `${year}-${pad(month + 1)}-${pad(lastDay.getDate())}`;
      const res = await getLogsRange(from, to);
      const map: Record<string, { total: number; target: number }> = {};
      for (const d of res.days) {
        map[d.date] = { total: d.total, target: d.target };
      }
      setDayData(map);
    } catch {
      setDayData({});
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, [year, month]);

  const fetchWeeklyData = useCallback(async () => {
    try {
      const end = new Date(today + "T12:00:00");
      const start = new Date(today + "T12:00:00");
      start.setDate(start.getDate() - 6);
      const from = start.toISOString().slice(0, 10);
      const to = end.toISOString().slice(0, 10);
      const res = await getLogsRange(from, to);
      const dayLabelsShort = ["D", "L", "M", "M", "J", "V", "S"];
      const labels: string[] = [];
      const data: number[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        labels.push(dayLabelsShort[d.getDay()]);
        const found = res.days.find((r) => r.date === key);
        data.push(found ? found.total : 0);
      }
      setWeeklyLabels(labels);
      setWeeklyData(data);
    } catch {
      setWeeklyData([0, 0, 0, 0, 0, 0, 0]);
    }
  }, [today]);

  useEffect(() => { fetchMonthData(); }, [fetchMonthData]);
  useEffect(() => { fetchWeeklyData(); }, [fetchWeeklyData]);

  const cells = getMonthGrid(year, month);

  const goToPrevMonth = () => {
    setMonth((m) => m === 0 ? 11 : m - 1);
    if (month === 0) setYear((y) => y - 1);
  };
  const goToNextMonth = () => {
    setMonth((m) => m === 11 ? 0 : m + 1);
    if (month === 11) setYear((y) => y + 1);
  };

  const daysWithData = Object.values(dayData).filter((d) => d.total > 0);
  const totalKcal = daysWithData.reduce((sum, d) => sum + d.total, 0);
  const avgKcal = daysWithData.length > 0 ? Math.round(totalKcal / daysWithData.length) : 0;
  const bestDay = daysWithData.length > 0
    ? daysWithData.reduce((best, d) =>
        Math.abs(d.total - d.target) < Math.abs(best.total - best.target) ? d : best,
      daysWithData[0])
    : null;

  const cellSize = (SCREEN_WIDTH - 48 - 12) / 7;

  const maxWeekly = Math.max(...weeklyData, 1);
  const CHART_HEIGHT = 140;

  const handleDayPress = (dateStr: string) => {
    setSelectedDay(dateStr);
    onSelectDate?.(dateStr);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <IconButton icon="arrow-back" onPress={onBack} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: C.textPrimary }}>
            Historique
          </Text>
          <Text style={{ fontSize: 13, color: C.textSecondary }}>
            Suivez vos progrès
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginHorizontal: 24,
            marginBottom: 12,
            backgroundColor: C.card,
            borderRadius: 14,
            padding: 6,
            borderWidth: 1,
            borderColor: C.border,
            opacity: headerFade,
          }}
        >
          <Pressable
            onPress={goToPrevMonth}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: pressed ? C.accent + "15" : "transparent",
              alignItems: "center", justifyContent: "center",
            })}
            accessibilityLabel="Mois précédent"
          >
            <Ionicons name="chevron-back" size={20} color={C.textPrimary} />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: "700", color: C.textPrimary }}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <Pressable
            onPress={goToNextMonth}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: pressed ? C.accent + "15" : "transparent",
              alignItems: "center", justifyContent: "center",
            })}
            accessibilityLabel="Mois suivant"
          >
            <Ionicons name="chevron-forward" size={20} color={C.textPrimary} />
          </Pressable>
        </Animated.View>

        <Animated.View
          style={{
            marginHorizontal: 24,
            backgroundColor: C.card,
            borderRadius: 20,
            padding: 12,
            borderWidth: 1,
            borderColor: C.border,
            opacity: calFade,
          }}
        >
          <View style={{ flexDirection: "row", marginBottom: 4 }}>
            {DAY_LABELS.map((label, i) => (
              <View key={i} style={{ width: cellSize, alignItems: "center", paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: C.textSecondary, letterSpacing: 0.5 }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator color={C.accent} />
            </View>
          ) : (
            Array.from({ length: cells.length / 7 }, (_, rowIdx) => (
              <View key={rowIdx} style={{ flexDirection: "row" }}>
                {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                  if (day === null) {
                    return <View key={colIdx} style={{ width: cellSize, height: cellSize }} />;
                  }
                  const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
                  const data = dayData[dateStr];
                  const isToday = dateStr === today;
                  const isFuture = dateStr > today;
                  const hasData = data && data.total > 0;
                  const isUnder = hasData && data.total <= data.target;
                  const isSelected = selectedDay === dateStr;

                  let bgColor = "transparent";
                  if (isSelected) bgColor = C.accent + "20";
                  else if (isToday) bgColor = C.accent + "10";

                  let indicatorColor = "transparent";
                  if (hasData) indicatorColor = isUnder ? C.primary : C.accent;
                  else if (!isFuture) indicatorColor = C.paleOak + "20";

                  const pct = hasData && data.target > 0
                    ? Math.min(data.total / data.target, 1)
                    : 0;

                  return (
                    <Pressable
                      key={colIdx}
                      onPress={() => !isFuture && handleDayPress(dateStr)}
                      disabled={isFuture}
                      style={({ pressed }) => ({
                        width: cellSize,
                        height: cellSize,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        backgroundColor: pressed ? C.accent + "15" : bgColor,
                        opacity: isFuture ? 0.3 : 1,
                      })}
                      accessibilityLabel={`${day} ${MONTH_NAMES[month]}`}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: isToday || isSelected ? "700" : "400",
                          color: isToday ? C.accent : C.textPrimary,
                        }}
                      >
                        {day}
                      </Text>

                      <View
                        style={{
                          width: cellSize * 0.55,
                          height: 3,
                          borderRadius: 1.5,
                          backgroundColor: indicatorColor === "transparent" ? "transparent" : indicatorColor + "25",
                          marginTop: 3,
                          overflow: "hidden",
                        }}
                      >
                        {pct > 0 && (
                          <View
                            style={{
                              width: `${pct * 100}%` as any,
                              height: 3,
                              borderRadius: 1.5,
                              backgroundColor: indicatorColor,
                            }}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 16, height: 3, borderRadius: 1.5, backgroundColor: C.primary }} />
              <Text style={{ fontSize: 11, color: C.textSecondary }}>Objectif atteint</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 16, height: 3, borderRadius: 1.5, backgroundColor: C.accent }} />
              <Text style={{ fontSize: 11, color: C.textSecondary }}>Dépassé</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            flexDirection: "row",
            gap: 10,
            marginTop: 20,
            paddingHorizontal: 24,
            opacity: chartFade,
          }}
        >
          <StatCard icon="analytics-outline" label="Moyenne" value={avgKcal} unit="kcal/jour" color={C.teal} delay={0} C={C} />
          <StatCard icon="calendar-outline" label="Jours suivis" value={daysWithData.length} unit="jours" color={C.primary} delay={80} C={C} />
          <StatCard icon="flame-outline" label="Total" value={totalKcal} unit="kcal" color={C.accent} delay={160} C={C} />
        </Animated.View>

        <Animated.View style={{ marginTop: 20, paddingHorizontal: 24, opacity: chartFade }}>
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <View
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: C.accent + "15",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Ionicons name="bar-chart-outline" size={14} color={C.accent} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", color: C.textPrimary }}>
                7 derniers jours
              </Text>
            </View>

            {weeklyData.some((d) => d > 0) ? (
              <View style={{ height: CHART_HEIGHT + 40 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    height: CHART_HEIGHT,
                    gap: 8,
                    paddingHorizontal: 4,
                  }}
                >
                  {weeklyData.map((val, i) => {
                    const barH = maxWeekly > 0 ? (val / maxWeekly) * CHART_HEIGHT * 0.85 : 0;
                    const isToday = i === weeklyData.length - 1;
                    const barColor = isToday ? C.accent : C.accent + "70";

                    return (
                      <View key={i} style={{ flex: 1, alignItems: "center" }}>
                        {val > 0 && (
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "600",
                              color: C.textSecondary,
                              marginBottom: 4,
                            }}
                          >
                            {val}
                          </Text>
                        )}
                        <View
                          style={{
                            width: "100%",
                            height: Math.max(barH, val > 0 ? 4 : 2),
                            borderRadius: 6,
                            backgroundColor: val > 0 ? barColor : C.paleOak + "15",
                          }}
                        />
                      </View>
                    );
                  })}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    paddingHorizontal: 4,
                    marginTop: 8,
                  }}
                >
                  {weeklyLabels.map((label, i) => {
                    const isToday = i === weeklyLabels.length - 1;
                    return (
                      <View key={i} style={{ flex: 1, alignItems: "center" }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: isToday ? "700" : "500",
                            color: isToday ? C.accent : C.textSecondary,
                          }}
                        >
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={{ paddingVertical: 32, alignItems: "center", gap: 8 }}>
                <Ionicons name="bar-chart-outline" size={32} color={C.paleOak + "40"} />
                <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: "center" }}>
                  Pas encore de données cette semaine
                </Text>
                <Text style={{ fontSize: 12, color: C.paleOak }}>
                  Ajoutez vos repas pour voir le graphique
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {bestDay && (
          <Animated.View style={{ marginTop: 16, paddingHorizontal: 24, opacity: chartFade }}>
            <View
              style={{
                backgroundColor: C.primary + "12",
                borderRadius: 16,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderWidth: 1,
                borderColor: C.primary + "20",
              }}
            >
              <View
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: C.primary + "20",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Ionicons name="trophy-outline" size={20} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: C.primary, fontWeight: "600" }}>
                  Meilleur jour du mois
                </Text>
                <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
                  {bestDay.total.toLocaleString("fr-FR")} kcal — le plus proche de votre objectif
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
