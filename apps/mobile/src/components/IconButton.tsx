import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  bg?: string;
  hitSlop?: number;
}

export function IconButton({
  icon,
  onPress,
  size = 40,
  iconSize = 22,
  color,
  bg,
  hitSlop = 12,
}: Props) {
  const { C } = useTheme();
  const resolvedColor = color ?? C.primaryDark;
  const resolvedBg = bg ?? C.paleOak + "25";
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: resolvedBg,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={iconSize} color={resolvedColor} />
    </Pressable>
  );
}
