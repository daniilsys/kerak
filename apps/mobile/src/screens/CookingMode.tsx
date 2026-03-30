import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Recipe } from "@kerak/types";
import { useTheme } from "../theme/ThemeContext";
import { IconButton } from "../components/IconButton";
import { completeRecipe } from "../utils/api";

function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const { C } = useTheme();
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(width, {
      toValue: ((current + 1) / total) * 100,
      useNativeDriver: false,
      damping: 18,
      stiffness: 120,
    }).start();
  }, [current, total]);

  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 4 }}>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: C.paleOak + "30",
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: C.accent,
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          }}
        />
      </View>

      <Text
        style={{
          fontSize: 13,
          color: C.paleOak,
          textAlign: "center",
          marginTop: 8,
          fontWeight: "500",
          letterSpacing: 0.2,
        }}
      >
        Étape {current + 1} sur {total}
      </Text>
    </View>
  );
}

function AnimatedCheckmark() {
  const { C } = useTheme();
  const scale = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 10,
          stiffness: 150,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-30deg", "0deg"],
  });

  return (
    <Animated.View
      style={{
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: C.primary,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale }, { rotate: spin }],
        shadowColor: C.primaryDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <Ionicons name="checkmark-sharp" size={48} color={C.white} />
    </Animated.View>
  );
}

function SuccessScreen({
  recipe,
  onLogRecipe,
  onFinish,
}: {
  recipe: Recipe;
  onLogRecipe?: (calories: number) => void;
  onFinish: () => void;
}) {
  const { C } = useTheme();
  const [showPortions, setShowPortions] = useState(false);
  const [portions, setPortions] = useState(1);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: fadeIn,
        transform: [{ translateY: slideUp }],
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
      }}
    >
      <AnimatedCheckmark />

      <Text
        style={{
          fontSize: 28,
          fontWeight: "800",
          color: C.primaryDark,
          textAlign: "center",
          marginTop: 28,
          marginBottom: 8,
        }}
      >
        Recette terminée !
      </Text>

      <Text
        style={{
          fontSize: 17,
          fontWeight: "600",
          color: C.greyOlive,
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        {recipe.name}
      </Text>

      <View
        style={{
          flexDirection: "row",
          gap: 24,
          marginBottom: 40,
        }}
      >
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons name="time-outline" size={18} color={C.teal} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.teal }}>
              {recipe.duration} min
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: C.paleOak, marginTop: 2 }}>
            Durée totale
          </Text>
        </View>

        <View
          style={{
            width: 1,
            backgroundColor: C.paleOak + "30",
          }}
        />

        <View style={{ alignItems: "center" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons name="flame-outline" size={18} color={C.accent} />
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: C.accent }}
            >
              {recipe.calories} kcal
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: C.paleOak, marginTop: 2 }}>
            Calories
          </Text>
        </View>
      </View>

      {onLogRecipe && !showPortions && (
        <Pressable
          onPress={() => setShowPortions(true)}
          style={({ pressed }) => ({
            width: "100%",
            height: 56,
            borderRadius: 28,
            backgroundColor: C.accent,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            marginBottom: 12,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Ionicons name="add-circle-outline" size={20} color={C.white} />
          <Text style={{ fontSize: 17, fontWeight: "700", color: C.white }}>
            Ajouter au suivi
          </Text>
        </Pressable>
      )}

      {onLogRecipe && showPortions && (
        <View
          style={{
            width: "100%",
            backgroundColor: C.white,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: C.paleOak + "20",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: C.primaryDark,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            Nombre de portions
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              marginBottom: 16,
            }}
          >
            <Pressable
              onPress={() => setPortions((p) => Math.max(0.5, p - 0.5))}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: C.paleOak + "20",
                alignItems: "center",
                justifyContent: "center",
                opacity: portions <= 0.5 ? 0.3 : pressed ? 0.7 : 1,
              })}
              disabled={portions <= 0.5}
            >
              <Ionicons name="remove" size={22} color={C.primaryDark} />
            </Pressable>

            <Text
              style={{
                fontSize: 28,
                fontWeight: "800",
                color: C.primaryDark,
                minWidth: 48,
                textAlign: "center",
              }}
            >
              {portions}
            </Text>

            <Pressable
              onPress={() => setPortions((p) => Math.min(10, p + 0.5))}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: C.paleOak + "20",
                alignItems: "center",
                justifyContent: "center",
                opacity: portions >= 10 ? 0.3 : pressed ? 0.7 : 1,
              })}
              disabled={portions >= 10}
            >
              <Ionicons name="add" size={22} color={C.primaryDark} />
            </Pressable>
          </View>

          <Text
            style={{
              fontSize: 14,
              color: C.greyOlive,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {recipe.calories} × {portions} ={" "}
            <Text style={{ fontWeight: "700", color: C.accent }}>
              {Math.round(recipe.calories * portions)} kcal
            </Text>
          </Text>

          <Pressable
            onPress={() => onLogRecipe(Math.round(recipe.calories * portions))}
            style={({ pressed }) => ({
              width: "100%",
              height: 50,
              borderRadius: 25,
              backgroundColor: C.accent,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.white }}>
              Confirmer
            </Text>
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={onFinish}
        style={({ pressed }) => ({
          width: "100%",
          height: 56,
          borderRadius: 28,
          backgroundColor: C.white,
          borderWidth: 1,
          borderColor: C.paleOak + "40",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <Ionicons name="arrow-back" size={18} color={C.primaryDark} />
        <Text
          style={{ fontSize: 17, fontWeight: "700", color: C.primaryDark }}
        >
          Retour
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function StepView({
  step,
}: {
  step: Recipe["steps"][number];
}) {
  const { C } = useTheme();
  const badgeFade = useRef(new Animated.Value(0)).current;
  const badgeSlide = useRef(new Animated.Value(30)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const tipFade = useRef(new Animated.Value(0)).current;
  const tipSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    badgeFade.setValue(0);
    badgeSlide.setValue(30);
    titleFade.setValue(0);
    titleSlide.setValue(30);
    cardFade.setValue(0);
    cardSlide.setValue(30);
    tipFade.setValue(0);
    tipSlide.setValue(30);

    const staggerDelay = 80;

    const makeAnim = (
      fade: Animated.Value,
      slide: Animated.Value,
      delay: number,
    ) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(fade, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.spring(slide, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 200,
          }),
        ]),
      ]);

    Animated.parallel([
      makeAnim(badgeFade, badgeSlide, 0),
      makeAnim(titleFade, titleSlide, staggerDelay),
      makeAnim(cardFade, cardSlide, staggerDelay * 2),
      makeAnim(tipFade, tipSlide, staggerDelay * 3),
    ]).start();
  }, [step.stepNumber]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={{
          alignItems: "center",
          marginBottom: 24,
          opacity: badgeFade,
          transform: [{ translateY: badgeSlide }],
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: C.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "800", color: C.white }}>
            {step.stepNumber}
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        style={{
          marginBottom: 24,
          opacity: titleFade,
          transform: [{ translateY: titleSlide }],
        }}
      >
        <Text
          style={{
            fontSize: 26,
            fontWeight: "800",
            color: C.primaryDark,
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: -0.3,
          }}
        >
          {step.title ?? `Étape ${step.stepNumber}`}
        </Text>

        {step.duration != null && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Ionicons name="time-outline" size={16} color={C.teal} />
            <Text
              style={{ fontSize: 14, color: C.teal, fontWeight: "600" }}
            >
              {step.duration} min
            </Text>
          </View>
        )}
      </Animated.View>

      <Animated.View
        style={{
          backgroundColor: C.white,
          borderRadius: 16,
          padding: 22,
          borderWidth: 1,
          borderColor: C.paleOak + "20",
          opacity: cardFade,
          transform: [{ translateY: cardSlide }],
        }}
      >
        <Text
          style={{
            fontSize: 17,
            lineHeight: 30,
            color: C.greyOlive,
            letterSpacing: 0.1,
          }}
        >
          {step.description}
        </Text>
      </Animated.View>

      {step.tip && (
        <Animated.View
          style={{
            flexDirection: "row",
            gap: 10,
            backgroundColor: C.accent + "15",
            borderRadius: 14,
            padding: 16,
            marginTop: 16,
            opacity: tipFade,
            transform: [{ translateY: tipSlide }],
          }}
        >
          <Ionicons
            name="bulb-outline"
            size={20}
            color={C.accent}
            style={{ marginTop: 2 }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              lineHeight: 23,
              color: C.primaryDark,
            }}
          >
            {step.tip}
          </Text>
        </Animated.View>
      )}
    </ScrollView>
  );
}

interface Props {
  recipe: Recipe;
  onFinish: () => void;
  onLogRecipe?: (calories: number) => void;
}

export default function CookingMode({
  recipe,
  onFinish,
  onLogRecipe,
}: Props) {
  const { C } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const steps = recipe.steps;
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      setShowSuccess(true);
      completeRecipe(recipe).catch(() => {});
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [isLast, recipe]);

  if (showSuccess) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.secondaryBg }}>
        <SuccessScreen
          recipe={recipe}
          onLogRecipe={onLogRecipe}
          onFinish={onFinish}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.secondaryBg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <IconButton icon="close" onPress={onFinish} />
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: C.primaryDark,
          }}
          numberOfLines={1}
        >
          {recipe.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ProgressBar current={currentStep} total={steps.length} />

      <StepView key={currentStep} step={steps[currentStep]} />

      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 24,
          paddingBottom: 24,
          paddingTop: 12,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => setCurrentStep((s) => s - 1)}
          disabled={isFirst}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: C.white,
            borderWidth: 1,
            borderColor: C.paleOak + "30",
            alignItems: "center",
            justifyContent: "center",
            opacity: isFirst ? 0.3 : pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="arrow-back" size={22} color={C.primaryDark} />
        </Pressable>

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => ({
            flex: 1,
            height: 56,
            borderRadius: 28,
            backgroundColor: isLast ? C.primary : C.accent,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", color: C.white }}>
            {isLast ? "Terminer" : "Étape suivante"}
          </Text>
          <Ionicons
            name={isLast ? "checkmark" : "arrow-forward"}
            size={20}
            color={C.white}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
