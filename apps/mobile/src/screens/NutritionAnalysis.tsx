import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  ActivityIndicator,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { IconButton } from "../components/IconButton";
import { getNutritionData, analyzeNutrition } from "../utils/api";

const SP = 8;

function todayStr() {
  const now = new Date();
  if (now.getHours() < 5) now.setDate(now.getDate() - 1);
  return now.toISOString().slice(0, 10);
}

function weekAgoStr() {
  const now = new Date();
  if (now.getHours() < 5) now.setDate(now.getDate() - 1);
  now.setDate(now.getDate() - 6);
  return now.toISOString().slice(0, 10);
}

function MacroRow({
  label,
  value,
  unit,
  color,
  max,
  C,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  max: number;
  C: any;
}) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
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
    <View style={{ gap: 6 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: C.textPrimary }}>
          {label}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: "700", color }}>
          {value}
          <Text
            style={{ fontSize: 12, fontWeight: "400", color: C.textSecondary }}
          >
            {" "}
            {unit}
          </Text>
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: C.paleOak + "15",
        }}
      >
        <Animated.View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          }}
        />
      </View>
    </View>
  );
}

interface Props {
  onBack: () => void;
}

export default function NutritionAnalysis({ onBack }: Props) {
  const { C } = useTheme();

  const [data, setData] = useState<{
    avgProtein: number;
    avgCarbs: number;
    avgFats: number;
    avgFiber: number;
    avgCalories: number;
    days: number;
  } | null>(null);
  const [advice, setAdvice] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const from = weekAgoStr();
    const to = todayStr();
    getNutritionData(from, to)
      .then((d) => {
        setData(d);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAnalyze = async () => {
    if (!data) return;
    setAnalyzing(true);
    try {
      const result = await analyzeNutrition(data);
      setAdvice(result.advice ?? []);
    } catch {
      setAdvice(["Impossible d'obtenir l'analyse. Réessayez."]);
    } finally {
      setAnalyzing(false);
    }
  };

  const hasData = data && data.days > 0;

  const totalMacroG = hasData
    ? data.avgProtein + data.avgCarbs + data.avgFats
    : 0;
  const protPct =
    totalMacroG > 0 ? Math.round((data!.avgProtein / totalMacroG) * 100) : 0;
  const carbPct =
    totalMacroG > 0 ? Math.round((data!.avgCarbs / totalMacroG) * 100) : 0;
  const fatPct =
    totalMacroG > 0 ? Math.round((data!.avgFats / totalMacroG) * 100) : 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: C.background }}
      edges={["top"]}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: SP * 2.5,
          paddingVertical: SP * 1.5,
        }}
      >
        <IconButton icon="arrow-back" onPress={onBack} />
        <View style={{ flex: 1, marginLeft: SP * 1.5 }}>
          <Text
            style={{ fontSize: 22, fontWeight: "800", color: C.textPrimary }}
          >
            Nutrition
          </Text>
          <Text style={{ fontSize: 13, color: C.textSecondary }}>
            Analyse des 7 derniers jours
          </Text>
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : !hasData ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: C.paleOak + "15",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons name="nutrition-outline" size={32} color={C.paleOak} />
          </View>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: C.textPrimary,
              textAlign: "center",
              marginBottom: 6,
            }}
          >
            Pas assez de données
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: C.textSecondary,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Ajoutez des aliments avec les calories pour voir l'analyse
            nutritionnelle
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: SP * 3,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Overview card */}
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 20,
                padding: SP * 2.5,
                borderWidth: 1,
                borderColor: C.border,
                marginBottom: SP * 2.5,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: SP,
                  marginBottom: SP * 2,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: C.accent + "15",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="pie-chart-outline"
                    size={14}
                    color={C.accent}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: C.textPrimary,
                  }}
                >
                  Répartition moyenne
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: C.textSecondary,
                    marginLeft: "auto",
                  }}
                >
                  {data.days} jours
                </Text>
              </View>

              {/* Macro distribution bar */}
              <View
                style={{
                  flexDirection: "row",
                  height: 12,
                  borderRadius: 6,
                  overflow: "hidden",
                  marginBottom: SP * 2,
                }}
              >
                <View
                  style={{
                    width: `${protPct}%` as any,
                    backgroundColor: C.teal,
                  }}
                />
                <View
                  style={{
                    width: `${carbPct}%` as any,
                    backgroundColor: C.accent,
                  }}
                />
                <View
                  style={{
                    width: `${fatPct}%` as any,
                    backgroundColor: C.amber,
                  }}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-around",
                  marginBottom: SP * 2.5,
                }}
              >
                {[
                  { label: "Protéines", pct: protPct, color: C.teal },
                  { label: "Glucides", pct: carbPct, color: C.accent },
                  { label: "Lipides", pct: fatPct, color: C.amber },
                ].map((item) => (
                  <View
                    key={item.label}
                    style={{ alignItems: "center", gap: 4 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: item.color,
                        }}
                      />
                      <Text style={{ fontSize: 12, color: C.textSecondary }}>
                        {item.label}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "800",
                        color: C.textPrimary,
                      }}
                    >
                      {item.pct}%
                    </Text>
                  </View>
                ))}
              </View>

              {/* Detailed bars */}
              <View style={{ gap: SP * 2 }}>
                <MacroRow
                  label="Protéines"
                  value={data.avgProtein}
                  unit="g/jour"
                  color={C.teal}
                  max={150}
                  C={C}
                />
                <MacroRow
                  label="Glucides"
                  value={data.avgCarbs}
                  unit="g/jour"
                  color={C.accent}
                  max={300}
                  C={C}
                />
                <MacroRow
                  label="Lipides"
                  value={data.avgFats}
                  unit="g/jour"
                  color={C.amber}
                  max={100}
                  C={C}
                />
                <MacroRow
                  label="Fibres"
                  value={data.avgFiber}
                  unit="g/jour"
                  color={C.primary}
                  max={35}
                  C={C}
                />
              </View>
            </View>

            {/* Calories card */}
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 20,
                padding: SP * 2.5,
                borderWidth: 1,
                borderColor: C.border,
                marginBottom: SP * 2.5,
                flexDirection: "row",
                alignItems: "center",
                gap: SP * 2,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: C.accent + "15",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="flame" size={24} color={C.accent} />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: C.textSecondary }}>
                  Moyenne quotidienne
                </Text>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "800",
                    color: C.textPrimary,
                  }}
                >
                  {data.avgCalories}{" "}
                  <Text style={{ fontSize: 14, fontWeight: "500" }}>kcal</Text>
                </Text>
              </View>
            </View>

            {/* AI Analysis */}
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 20,
                padding: SP * 2.5,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: SP,
                  marginBottom: SP * 2,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: C.primary + "15",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="bulb-outline" size={14} color={C.primary} />
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: C.textPrimary,
                  }}
                >
                  Conseils personnalisés
                </Text>
              </View>

              {advice.length > 0 ? (
                <View style={{ gap: SP * 1.5 }}>
                  {advice.map((tip, i) => (
                    <View
                      key={i}
                      style={{ flexDirection: "row", gap: SP * 1.5 }}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: C.primary + "15",
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: C.primary,
                          }}
                        >
                          {i + 1}
                        </Text>
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 14,
                          lineHeight: 20,
                          color: C.textPrimary,
                        }}
                      >
                        {tip}
                      </Text>
                    </View>
                  ))}
                  <Pressable
                    onPress={handleAnalyze}
                    style={({ pressed }) => ({
                      marginTop: SP,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      paddingVertical: 10,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Ionicons name="refresh" size={16} color={C.accent} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: C.accent,
                      }}
                    >
                      Nouvelle analyse
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handleAnalyze}
                  disabled={analyzing}
                  style={({ pressed }) => ({
                    backgroundColor: C.primary + "12",
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                    borderWidth: 1,
                    borderColor: C.primary + "20",
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  {analyzing ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : (
                    <Ionicons name="sparkles" size={18} color={C.primary} />
                  )}
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: C.primary,
                    }}
                  >
                    {analyzing ? "Analyse en cours..." : "Analyser avec l'IA"}
                  </Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
