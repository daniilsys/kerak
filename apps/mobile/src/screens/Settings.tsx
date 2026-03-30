import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import type { ThemeName } from "../theme/themes";
import { loadNotifPrefs, saveNotifPrefs } from "../utils/storage";
import {
  type MealReminderConfig,
  DEFAULT_REMINDERS,
  requestPermissions,
  scheduleMealReminders,
  cancelAllReminders,
} from "../utils/notifications";

interface Props {
  onReset: () => void;
}

const THEME_OPTIONS: { key: ThemeName; label: string; desc: string; preview: string }[] = [
  { key: "light", label: "Clair", desc: "Palette chaleureuse", preview: "#EFD0CA" },
  { key: "dark-nature", label: "Sombre Nature", desc: "Tons verts profonds", preview: "#1A2E1A" },
  { key: "dark-neutral", label: "Sombre Neutre", desc: "Gris classique", preview: "#121212" },
];

const MEAL_LABELS: { key: keyof MealReminderConfig; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "breakfast", label: "Petit-déjeuner", icon: "sunny-outline" },
  { key: "lunch", label: "Déjeuner", icon: "restaurant-outline" },
  { key: "dinner", label: "Dîner", icon: "moon-outline" },
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export default function Settings({ onReset }: Props) {
  const { C, themeName, setThemeName } = useTheme();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [reminders, setReminders] = useState<MealReminderConfig>(DEFAULT_REMINDERS);

  useEffect(() => {
    loadNotifPrefs().then((saved) => {
      if (saved) {
        setReminders(saved.config ?? DEFAULT_REMINDERS);
        setNotifEnabled(saved.enabled ?? false);
      }
    });
  }, []);

  const toggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestPermissions();
      if (!granted) return;
    }
    setNotifEnabled(enabled);
    const prefs = { enabled, config: reminders };
    await saveNotifPrefs(prefs);
    if (enabled) {
      await scheduleMealReminders(reminders);
    } else {
      await cancelAllReminders();
    }
  };

  const toggleMeal = async (meal: keyof MealReminderConfig) => {
    const updated = {
      ...reminders,
      [meal]: { ...reminders[meal], enabled: !reminders[meal].enabled },
    };
    setReminders(updated);
    const prefs = { enabled: notifEnabled, config: updated };
    await saveNotifPrefs(prefs);
    if (notifEnabled) await scheduleMealReminders(updated);
  };

  const adjustTime = async (meal: keyof MealReminderConfig, delta: number) => {
    const current = reminders[meal];
    let totalMin = current.hour * 60 + current.minute + delta * 30;
    if (totalMin < 0) totalMin = 0;
    if (totalMin > 23 * 60 + 30) totalMin = 23 * 60 + 30;
    const updated = {
      ...reminders,
      [meal]: { ...current, hour: Math.floor(totalMin / 60), minute: totalMin % 60 },
    };
    setReminders(updated);
    const prefs = { enabled: notifEnabled, config: updated };
    await saveNotifPrefs(prefs);
    if (notifEnabled) await scheduleMealReminders(updated);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 28, fontWeight: "800", color: C.textPrimary, marginBottom: 28 }}>
          Paramètres
        </Text>

        {/* ── Apparence ── */}
        <SectionHeader label="Apparence" C={C} />
        <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
          {THEME_OPTIONS.map((opt, i) => {
            const selected = themeName === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setThemeName(opt.key)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  gap: 14,
                  backgroundColor: pressed ? C.accent + "08" : "transparent",
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: C.border,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: opt.preview,
                    borderWidth: 2,
                    borderColor: selected ? C.accent : C.border,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: C.textPrimary }}>
                    {opt.label}
                  </Text>
                  <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 1 }}>
                    {opt.desc}
                  </Text>
                </View>
                {selected && <Ionicons name="checkmark-circle" size={22} color={C.accent} />}
              </Pressable>
            );
          })}
        </View>

        {/* ── Notifications ── */}
        <SectionHeader label="Notifications" C={C} />
        <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
          {/* Global toggle */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              gap: 14,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: C.accent + "14",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="notifications-outline" size={18} color={C.accent} />
            </View>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: C.textPrimary }}>
              Rappels de repas
            </Text>
            <Switch
              value={notifEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: C.paleOak + "40", true: C.accent + "60" }}
              thumbColor={notifEnabled ? C.accent : C.paleOak}
            />
          </View>

          {/* Per-meal settings */}
          {notifEnabled &&
            MEAL_LABELS.map((m) => {
              const cfg = reminders[m.key];
              return (
                <View
                  key={m.key}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    paddingLeft: 24,
                    borderTopWidth: 1,
                    borderTopColor: C.border,
                    gap: 12,
                  }}
                >
                  <Ionicons name={m.icon} size={18} color={cfg.enabled ? C.accent : C.paleOak} />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: cfg.enabled ? C.textPrimary : C.textSecondary,
                    }}
                  >
                    {m.label}
                  </Text>

                  {/* Time adjuster */}
                  {cfg.enabled && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Pressable
                        onPress={() => adjustTime(m.key, -1)}
                        hitSlop={8}
                        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                      >
                        <Ionicons name="remove-circle-outline" size={20} color={C.paleOak} />
                      </Pressable>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: C.accent, minWidth: 44, textAlign: "center" }}>
                        {pad(cfg.hour)}:{pad(cfg.minute)}
                      </Text>
                      <Pressable
                        onPress={() => adjustTime(m.key, 1)}
                        hitSlop={8}
                        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                      >
                        <Ionicons name="add-circle-outline" size={20} color={C.paleOak} />
                      </Pressable>
                    </View>
                  )}

                  <Switch
                    value={cfg.enabled}
                    onValueChange={() => toggleMeal(m.key)}
                    trackColor={{ false: C.paleOak + "40", true: C.accent + "60" }}
                    thumbColor={cfg.enabled ? C.accent : C.paleOak}
                  />
                </View>
              );
            })}
        </View>

        {/* ── Compte ── */}
        <SectionHeader label="Compte" C={C} />
        <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
          <Pressable
            onPress={() => {
              Alert.alert(
                "Se déconnecter",
                "Voulez-vous vraiment vous déconnecter ? Vos données locales seront effacées.",
                [
                  { text: "Annuler", style: "cancel" },
                  { text: "Déconnecter", style: "destructive", onPress: onReset },
                ],
              );
            }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              gap: 14,
              backgroundColor: pressed ? C.error + "08" : "transparent",
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: C.error + "14",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="log-out-outline" size={18} color={C.error} />
            </View>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: C.error }}>
              Se déconnecter
            </Text>
            <Ionicons name="chevron-forward" size={18} color={C.paleOak} />
          </Pressable>
        </View>

        {/* ── App ── */}
        <SectionHeader label="Application" C={C} />
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            padding: 16,
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.textPrimary }}>
            Kerak
          </Text>
          <Text style={{ fontSize: 13, color: C.textSecondary }}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ label, C }: { label: string; C: any }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "600",
        color: C.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginTop: 28,
        marginBottom: 10,
        marginLeft: 4,
      }}
    >
      {label}
    </Text>
  );
}
