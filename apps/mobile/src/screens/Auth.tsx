import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { register, login } from "../utils/api";
import type { UserProfile } from "../utils/calories";
import { calculateDailyCalories } from "../utils/calories";
import { saveProfile } from "../utils/storage";
import { useTheme } from "../theme/ThemeContext";

interface Props {
  profile: UserProfile;
  onSuccess: () => void;
  onSkip: () => void;
  initialMode?: "register" | "login";
}

export default function Auth({ profile, onSuccess, onSkip, initialMode = "register" }: Props) {
  const { C } = useTheme();
  const [mode, setMode] = useState<"register" | "login">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const mountAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const crossfade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(crossfade, {
      toValue: mode === "register" ? 0 : 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [mode]);

  const registerOpacity = crossfade.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const loginOpacity = crossfade.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const slideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: mode === "register" ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 70,
    }).start();
  }, [mode]);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [error]);

  const errorOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(errorOpacity, {
      toValue: error ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [error]);

  const switchMode = useCallback(
    (m: "register" | "login") => {
      if (m === mode) return;
      setMode(m);
      setError(null);
    },
    [mode],
  );

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email et mot de passe requis");
      return;
    }
    if (password.length < 6) {
      setError("Mot de passe : 6 caractères minimum");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const calories = calculateDailyCalories(profile);
      if (mode === "register") {
        await register(email.trim(), password, {
          gender: profile.gender,
          age: profile.age,
          height: profile.height,
          weight: profile.weight,
          activityLevel: profile.activityLevel,
          goal: profile.goal,
          dailyCalories: calories,
        });
      } else {
        await login(email.trim(), password);
      }
      await saveProfile(profile, calories);
      onSuccess();
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = !email.trim() && !password.trim();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.secondaryBg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 32,
            paddingBottom: 32,
          }}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              flex: 1,
              opacity: mountAnim,
              transform: [
                {
                  translateY: mountAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            }}
          >
            <View style={{ alignItems: "center", marginTop: 40, marginBottom: 32 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: C.accent + "18",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons
                  name={mode === "register" ? "person-add-outline" : "log-in-outline"}
                  size={32}
                  color={C.accent}
                />
              </View>

              <View style={{ height: 32, justifyContent: "center" }}>
                <Animated.Text
                  style={{
                    fontSize: 26,
                    fontWeight: "800",
                    color: C.primaryDark,
                    position: "absolute",
                    alignSelf: "center",
                    opacity: registerOpacity,
                  }}
                >
                  Créer un compte
                </Animated.Text>
                <Animated.Text
                  style={{
                    fontSize: 26,
                    fontWeight: "800",
                    color: C.primaryDark,
                    position: "absolute",
                    alignSelf: "center",
                    opacity: loginOpacity,
                  }}
                >
                  Se connecter
                </Animated.Text>
              </View>

              <View style={{ height: 40, justifyContent: "center", marginTop: 6 }}>
                <Animated.Text
                  style={{
                    fontSize: 15,
                    color: C.greyOlive,
                    textAlign: "center",
                    position: "absolute",
                    alignSelf: "center",
                    opacity: registerOpacity,
                  }}
                >
                  Pour sauvegarder vos recettes et suivre vos repas
                </Animated.Text>
                <Animated.Text
                  style={{
                    fontSize: 15,
                    color: C.greyOlive,
                    textAlign: "center",
                    position: "absolute",
                    alignSelf: "center",
                    opacity: loginOpacity,
                  }}
                >
                  Retrouvez votre historique et vos recettes
                </Animated.Text>
              </View>
            </View>

            <View style={{ marginBottom: 24 }}>
              <SliderToggle mode={mode} slideAnim={slideAnim} onSwitch={switchMode} />
            </View>

            <View style={{ gap: 16 }}>
              <View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: C.greyOlive,
                    marginBottom: 8,
                    marginLeft: 4,
                  }}
                >
                  Email
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: C.white,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: C.paleOak + "40",
                    paddingHorizontal: 14,
                  }}
                >
                  <Ionicons name="mail-outline" size={18} color={C.paleOak} />
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 10,
                      fontSize: 16,
                      color: C.primaryDark,
                    }}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@exemple.fr"
                    placeholderTextColor={C.paleOak}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: C.greyOlive,
                    marginBottom: 8,
                    marginLeft: 4,
                  }}
                >
                  Mot de passe
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: C.white,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: C.paleOak + "40",
                    paddingHorizontal: 14,
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={C.paleOak} />
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 10,
                      fontSize: 16,
                      color: C.primaryDark,
                    }}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="6 caractères minimum"
                    placeholderTextColor={C.paleOak}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={C.paleOak}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            {isEmpty && !error && (
              <View style={{ alignItems: "center", marginTop: 20 }}>
                <Text style={{ fontSize: 13, color: C.paleOak, fontStyle: "italic" }}>
                  Remplissez les champs ci-dessus pour continuer
                </Text>
              </View>
            )}

            {error ? (
              <Animated.View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: C.error + "12",
                  borderRadius: 10,
                  padding: 12,
                  marginTop: 16,
                  opacity: errorOpacity,
                  transform: [{ translateX: shakeAnim }],
                }}
              >
                <Ionicons name="alert-circle" size={16} color={C.error} />
                <Text style={{ flex: 1, fontSize: 13, color: C.error }}>{error}</Text>
              </Animated.View>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => ({
                marginTop: 24,
                backgroundColor: C.accent,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: loading ? 0.7 : pressed ? 0.85 : 1,
                transform: [{ scale: pressed && !loading ? 0.97 : 1 }],
              })}
            >
              {loading ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <Text style={{ fontSize: 17, fontWeight: "700", color: C.white }}>
                  {mode === "register" ? "Créer mon compte" : "Me connecter"}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={onSkip}
              style={({ pressed }) => ({
                marginTop: 16,
                alignItems: "center",
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Text style={{ fontSize: 14, color: C.paleOak }}>
                Continuer sans compte
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SliderToggle({
  mode,
  slideAnim,
  onSwitch,
}: {
  mode: "register" | "login";
  slideAnim: Animated.Value;
  onSwitch: (m: "register" | "login") => void;
}) {
  const { C } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  const pillWidth = containerWidth > 0 ? (containerWidth - 8) / 2 : 0;
  const pillTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, pillWidth],
  });

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: C.white,
        borderRadius: 12,
        padding: 4,
        position: "relative",
      }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {containerWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            width: pillWidth,
            height: "100%",
            borderRadius: 10,
            backgroundColor: C.accent,
            transform: [{ translateX: pillTranslateX }],
          }}
        />
      )}

      {(["register", "login"] as const).map((m) => (
        <Pressable
          key={m}
          onPress={() => onSwitch(m)}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: mode === m ? C.white : C.greyOlive,
            }}
          >
            {m === "register" ? "Inscription" : "Connexion"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
