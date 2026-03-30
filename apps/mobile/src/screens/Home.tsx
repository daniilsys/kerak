import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { loadProfile, clearProfile } from "../utils/storage";

const C = {
  primary: "#5C7457",
  primaryDark: "#214E34",
  secondaryBg: "#EFD0CA",
  greyOlive: "#5E6356",
};

interface Props {
  onReset?: () => void;
}

export default function Home({ onReset }: Props) {
  const [calories, setCalories] = useState<number | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProfile().then((data) => {
      if (data) setCalories(data.calories);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.secondaryBg }}>
      <Animated.View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
          opacity,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: C.primary + "18",
            marginBottom: 16,
          }}
        >
          <Ionicons name="nutrition" size={32} color={C.primary} />
        </View>
        <Text style={{ fontSize: 28, fontWeight: "700", color: C.primaryDark, marginBottom: 8 }}>
          Kerak
        </Text>
        {calories && (
          <Text style={{ fontSize: 16, textAlign: "center", color: C.greyOlive }}>
            Objectif : {calories} kcal / jour
          </Text>
        )}
        {onReset && (
          <Pressable
            onPress={async () => {
              await clearProfile();
              onReset();
            }}
            style={({ pressed }) => ({
              marginTop: 32,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.greyOlive + "40",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 14, color: C.greyOlive }}>Refaire le profil</Text>
          </Pressable>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}
