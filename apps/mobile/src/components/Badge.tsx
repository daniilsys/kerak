import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}

export function Badge({ icon, label, color }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: color + "15",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={{ fontSize: 13, fontWeight: "600", color }}>{label}</Text>
    </View>
  );
}
