import React from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import type { Tab } from "../App";

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; iconFilled: keyof typeof Ionicons.glyphMap }[] = [
  { key: "home", label: "Accueil", icon: "home-outline", iconFilled: "home" },
  { key: "tracking", label: "Suivi", icon: "flame-outline", iconFilled: "flame" },
  { key: "recettes", label: "Recettes", icon: "book-outline", iconFilled: "book" },
  { key: "settings", label: "Paramètres", icon: "settings-outline", iconFilled: "settings" },
];

interface Props {
  activeTab: Tab;
  onTabPress: (tab: Tab) => void;
}

export default function BottomTabBar({ activeTab, onTabPress }: Props) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: C.card,
        borderTopWidth: 1,
        borderTopColor: C.border,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingTop: 8,
        paddingHorizontal: 8,
      }}
    >
      {TABS.map((t) => {
        const active = activeTab === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onTabPress(t.key)}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 4,
            }}
            accessibilityLabel={t.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Ionicons
              name={active ? t.iconFilled : t.icon}
              size={22}
              color={active ? C.accent : C.paleOak}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: active ? "600" : "400",
                color: active ? C.accent : C.paleOak,
                marginTop: 2,
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
