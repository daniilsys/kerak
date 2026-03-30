import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  type UserProfile,
  type Gender,
  type ActivityLevel,
  type Goal,
  calculateDailyCalories,
  calculateBMR,
  calculateTDEE,
} from "../utils/calories";
import { saveProfile } from "../utils/storage";
import { useTheme } from "../theme/ThemeContext";
import { useFadeIn, useSlideIn } from "../hooks/useAnimations";

const GENDERS: { value: Gender; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "male", label: "Homme", icon: "man" },
  { value: "female", label: "Femme", icon: "woman" },
  { value: "other", label: "Autre", icon: "people" },
];

const ACTIVITIES: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: "sedentary", label: "Sédentaire", desc: "Peu ou pas d'exercice" },
  { value: "light", label: "Légèrement actif", desc: "Exercice 1-3 jours/sem" },
  { value: "moderate", label: "Modérément actif", desc: "Exercice 3-5 jours/sem" },
  { value: "active", label: "Actif", desc: "Exercice 6-7 jours/sem" },
  { value: "very_active", label: "Très actif", desc: "Sport intense quotidien" },
];

const GOALS: { value: Goal; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "lose", label: "Perdre du poids", desc: "-500 kcal/jour", icon: "trending-down" },
  { value: "maintain", label: "Maintenir", desc: "Équilibre calorique", icon: "swap-horizontal" },
  { value: "gain", label: "Prendre du poids", desc: "+300 kcal/jour", icon: "trending-up" },
];

const TOTAL_STEPS = 5;

function ProgressBar({ step }: { step: number }) {
  const { C } = useTheme();
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(width, {
      toValue: (step / TOTAL_STEPS) * 100,
      useNativeDriver: false,
      damping: 15,
      stiffness: 120,
    }).start();
  }, [step]);

  return (
    <View className="mx-6 mt-2 mb-4">
      <View
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: C.paleOak + "40" }}
      >
        <Animated.View
          className="h-1.5 rounded-full"
          style={{
            backgroundColor: C.accent,
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          }}
        />
      </View>
    </View>
  );
}

function SelectionCard({
  selected,
  onPress,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { C } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={{
          transform: [{ scale }],
          borderWidth: 2,
          borderColor: selected ? C.accent : C.paleOak + "50",
          backgroundColor: selected ? C.accent + "10" : C.white,
          borderRadius: 16,
          padding: 16,
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

function NavButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const { C } = useTheme();
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
        backgroundColor: isPrimary ? C.accent : C.white,
        borderWidth: isPrimary ? 0 : 2,
        borderColor: C.paleOak + "50",
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: "center" as const,
      })}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          color: isPrimary ? C.white : C.greyOlive,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function WelcomeStep({ onStart, onLogin }: { onStart: () => void; onLogin?: () => void }) {
  const { C } = useTheme();
  const icon = useFadeIn(200, 600);
  const title = useFadeIn(400, 600);
  const subtitle = useFadeIn(700, 600);
  const button = useFadeIn(1000, 400);

  return (
    <View style={{ flex: 1, justifyContent: "space-between", paddingHorizontal: 32, paddingBottom: 48 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ marginBottom: 32 }, icon]}>
          <View
            style={{
              width: 112,
              height: 112,
              borderRadius: 56,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: C.accent + "18",
            }}
          >
            <Ionicons name="nutrition" size={52} color={C.accent} />
          </View>
        </Animated.View>

        <Animated.View style={[{ alignItems: "center" }, title]}>
          <Text style={{ fontSize: 48, fontWeight: "800", color: C.primaryDark, marginBottom: 8 }}>
            Kerak
          </Text>
          <Text style={{ fontSize: 18, textAlign: "center", lineHeight: 28, color: C.greyOlive }}>
            Votre assistant culinaire{"\n"}intelligent
          </Text>
        </Animated.View>

        <Animated.View style={[{ marginTop: 32 }, subtitle]}>
          <Text style={{ fontSize: 15, textAlign: "center", lineHeight: 24, color: C.paleOak, paddingHorizontal: 16 }}>
            Créons votre profil pour des recettes{"\n"}adaptées à vos besoins nutritionnels
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[button, { gap: 14 }]}>
        <NavButton label="Commencer" onPress={onStart} />
        {onLogin && (
          <Pressable
            onPress={onLogin}
            style={({ pressed }) => ({
              alignItems: "center",
              paddingVertical: 8,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text style={{ fontSize: 15, color: C.greyOlive }}>
              Déjà un compte ?{" "}
              <Text style={{ fontWeight: "700", color: C.accent }}>Se connecter</Text>
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

function GenderStep({ value, onChange }: { value: Gender | null; onChange: (g: Gender) => void }) {
  const { C } = useTheme();
  const anim = useSlideIn();

  return (
    <Animated.View style={[{ flex: 1, paddingHorizontal: 28 }, anim]}>
      <Text style={{ fontSize: 28, fontWeight: "700", color: C.primaryDark, marginBottom: 24, paddingHorizontal: 4 }}>
        Vous êtes...
      </Text>
      <View style={{ gap: 12, paddingHorizontal: 4 }}>
        {GENDERS.map((g) => (
          <SelectionCard key={g.value} selected={value === g.value} onPress={() => onChange(g.value)}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                  backgroundColor: value === g.value ? C.accent + "20" : C.paleOak + "25",
                }}
              >
                <Ionicons
                  name={g.icon}
                  size={24}
                  color={value === g.value ? C.accent : C.greyOlive}
                />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: value === g.value ? C.primaryDark : C.greyOlive,
                }}
              >
                {g.label}
              </Text>
            </View>
          </SelectionCard>
        ))}
      </View>
    </Animated.View>
  );
}

const FIELD_RANGES = {
  age: { min: 10, max: 120, label: "Entre 10 et 120 ans" },
  height: { min: 80, max: 250, label: "Entre 80 et 250 cm" },
  weight: { min: 20, max: 350, label: "Entre 20 et 350 kg" },
} as const;

function validateField(key: "age" | "height" | "weight", value: string): string | null {
  if (value === "") return null;
  const n = parseInt(value, 10);
  const range = FIELD_RANGES[key];
  if (isNaN(n) || n < range.min || n > range.max) return range.label;
  return null;
}

function MeasurementsStep({
  age,
  height,
  weight,
  onChangeAge,
  onChangeHeight,
  onChangeWeight,
  onNext,
  onBack,
}: {
  age: string;
  height: string;
  weight: string;
  onChangeAge: (v: string) => void;
  onChangeHeight: (v: string) => void;
  onChangeWeight: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { C } = useTheme();
  const anim = useSlideIn();

  const fields: {
    key: "age" | "height" | "weight";
    label: string;
    value: string;
    onChange: (v: string) => void;
    unit: string;
    placeholder: string;
  }[] = [
    { key: "age", label: "Âge", value: age, onChange: onChangeAge, unit: "ans", placeholder: "25" },
    { key: "height", label: "Taille", value: height, onChange: onChangeHeight, unit: "cm", placeholder: "175" },
    { key: "weight", label: "Poids", value: weight, onChange: onChangeWeight, unit: "kg", placeholder: "70" },
  ];

  const allFilled = age !== "" && height !== "" && weight !== "";
  const hasError = fields.some((f) => validateField(f.key, f.value) !== null);
  const canProceed = allFilled && !hasError;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets
    >
      <Animated.View style={anim}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: C.primaryDark, marginBottom: 4 }}>
          Vos mesures
        </Text>
        <Text style={{ fontSize: 15, color: C.greyOlive, marginBottom: 24 }}>
          Ces données permettent de calculer vos besoins caloriques
        </Text>

        <View style={{ gap: 20 }}>
          {fields.map((field) => {
            const error = validateField(field.key, field.value);
            return (
              <View key={field.label}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: C.greyOlive, marginBottom: 8, marginLeft: 4 }}>
                  {field.label}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: C.white,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: error ? "#C2564B" : C.paleOak + "50",
                    paddingHorizontal: 16,
                  }}
                >
                  <TextInput
                    style={{ flex: 1, paddingVertical: 16, fontSize: 18, color: C.primaryDark }}
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder={field.placeholder}
                    placeholderTextColor={C.paleOak}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <Text style={{ fontSize: 15, fontWeight: "500", color: C.greyOlive, marginLeft: 8 }}>
                    {field.unit}
                  </Text>
                </View>
                {error && (
                  <Text style={{ fontSize: 12, color: "#C2564B", marginTop: 6, marginLeft: 4 }}>
                    {error}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: 32, gap: 12 }}>
          <NavButton label="Suivant" onPress={onNext} disabled={!canProceed} />
          <NavButton label="Retour" onPress={onBack} variant="secondary" />
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function ActivityStep({
  value,
  onChange,
}: {
  value: ActivityLevel | null;
  onChange: (a: ActivityLevel) => void;
}) {
  const { C } = useTheme();
  const anim = useSlideIn();

  return (
    <Animated.View style={[{ flex: 1, paddingHorizontal: 28 }, anim]}>
      <Text style={{ fontSize: 28, fontWeight: "700", color: C.primaryDark, marginBottom: 4, paddingHorizontal: 4 }}>
        Votre activité
      </Text>
      <Text style={{ fontSize: 15, color: C.greyOlive, marginBottom: 20, paddingHorizontal: 4 }}>
        Quel est votre niveau d'activité physique ?
      </Text>
      <View style={{ flex: 1, gap: 12, paddingHorizontal: 4 }}>
        {ACTIVITIES.map((a) => (
          <SelectionCard key={a.value} selected={value === a.value} onPress={() => onChange(a.value)}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: C.primaryDark }}>
              {a.label}
            </Text>
            <Text style={{ fontSize: 14, color: C.greyOlive, marginTop: 4 }}>
              {a.desc}
            </Text>
          </SelectionCard>
        ))}
      </View>
    </Animated.View>
  );
}

function GoalStep({ value, onChange }: { value: Goal | null; onChange: (g: Goal) => void }) {
  const { C } = useTheme();
  const anim = useSlideIn();

  return (
    <Animated.View style={[{ flex: 1, paddingHorizontal: 28 }, anim]}>
      <Text style={{ fontSize: 28, fontWeight: "700", color: C.primaryDark, marginBottom: 24, paddingHorizontal: 4 }}>
        Votre objectif
      </Text>
      <View style={{ gap: 12, paddingHorizontal: 4 }}>
        {GOALS.map((g) => (
          <SelectionCard key={g.value} selected={value === g.value} onPress={() => onChange(g.value)}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                  backgroundColor: value === g.value ? C.accent + "20" : C.paleOak + "25",
                }}
              >
                <Ionicons
                  name={g.icon}
                  size={22}
                  color={value === g.value ? C.accent : C.greyOlive}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: C.primaryDark }}>
                  {g.label}
                </Text>
                <Text style={{ fontSize: 14, color: C.greyOlive, marginTop: 2 }}>
                  {g.desc}
                </Text>
              </View>
            </View>
          </SelectionCard>
        ))}
      </View>
    </Animated.View>
  );
}

function ResultStep({ profile, onFinish }: { profile: UserProfile; onFinish: () => void }) {
  const { C } = useTheme();
  const bmr = Math.round(calculateBMR(profile));
  const tdee = Math.round(calculateTDEE(profile));
  const daily = calculateDailyCalories(profile);

  const icon = useFadeIn(200, 600);
  const number = useFadeIn(400, 600);
  const breakdown = useFadeIn(600, 400);
  const button = useFadeIn(900, 400);

  const goalLabel =
    profile.goal === "lose" ? "-500 kcal" : profile.goal === "gain" ? "+300 kcal" : "±0 kcal";

  const items = [
    { label: "Métabolisme de base", value: `${bmr} kcal` },
    { label: "Dépense totale", value: `${tdee} kcal` },
    { label: "Ajustement objectif", value: goalLabel },
  ];

  return (
    <View style={{ flex: 1, paddingHorizontal: 32, justifyContent: "space-between", paddingBottom: 48 }}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Animated.View style={[{ alignItems: "center" }, icon]}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: C.accent + "18",
              marginBottom: 24,
            }}
          >
            <Ionicons name="flame" size={38} color={C.accent} />
          </View>
        </Animated.View>

        <Animated.View style={[{ alignItems: "center" }, number]}>
          <Text style={{ fontSize: 15, color: C.greyOlive, marginBottom: 8 }}>
            Votre objectif quotidien
          </Text>
          <Text style={{ fontSize: 56, fontWeight: "800", color: C.primaryDark }}>
            {daily}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "500", color: C.accent, marginTop: 4 }}>
            kcal / jour
          </Text>
        </Animated.View>

        <Animated.View style={[{ marginTop: 40, width: "100%" }, breakdown]}>
          <View
            style={{
              backgroundColor: C.white,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: C.paleOak + "40",
            }}
          >
            {items.map((item, i) => (
              <View
                key={item.label}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  borderBottomWidth: i < items.length - 1 ? 1 : 0,
                  borderBottomColor: C.paleOak + "30",
                }}
              >
                <Text style={{ fontSize: 14, color: C.greyOlive }}>{item.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: C.primaryDark }}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      <Animated.View style={button}>
        <NavButton label="C'est parti !" onPress={onFinish} />
      </Animated.View>
    </View>
  );
}

interface Props {
  onComplete: (profile: UserProfile) => void;
  onLogin?: () => void;
}

export default function Onboarding({ onComplete, onLogin }: Props) {
  const { C } = useTheme();
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return gender !== null;
      case 2: return age !== "" && height !== "" && weight !== "";
      case 3: return activity !== null;
      case 4: return goal !== null;
      default: return true;
    }
  };

  const handleFinish = async () => {
    const profile: UserProfile = {
      gender: gender!,
      age: parseInt(age, 10),
      height: parseInt(height, 10),
      weight: parseInt(weight, 10),
      activityLevel: activity!,
      goal: goal!,
    };
    const calories = calculateDailyCalories(profile);
    await saveProfile(profile, calories);
    setStep(TOTAL_STEPS);
  };

  const buildProfile = (): UserProfile => ({
    gender: gender!,
    age: parseInt(age, 10),
    height: parseInt(height, 10),
    weight: parseInt(weight, 10),
    activityLevel: activity!,
    goal: goal!,
  });

  const renderStep = () => {
    switch (step) {
      case 0:
        return <WelcomeStep key="welcome" onStart={next} onLogin={onLogin} />;
      case 1:
        return <GenderStep key="gender" value={gender} onChange={setGender} />;
      case 2:
        return (
          <MeasurementsStep
            key="measurements"
            age={age}
            height={height}
            weight={weight}
            onChangeAge={setAge}
            onChangeHeight={setHeight}
            onChangeWeight={setWeight}
            onNext={next}
            onBack={back}
          />
        );
      case 3:
        return <ActivityStep key="activity" value={activity} onChange={setActivity} />;
      case 4:
        return <GoalStep key="goal" value={goal} onChange={setGoal} />;
      case TOTAL_STEPS:
        return <ResultStep key="result" profile={buildProfile()} onFinish={() => onComplete(buildProfile())} />;
      default:
        return null;
    }
  };

  const showNavBar = step >= 1 && step < TOTAL_STEPS && step !== 2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.secondaryBg }}>
      {step > 0 && step <= TOTAL_STEPS && <ProgressBar step={step} />}
      {renderStep()}
      {showNavBar && (
        <View style={{ paddingHorizontal: 32, paddingBottom: 32, paddingTop: 16, gap: 12 }}>
          <NavButton
            label={step === 4 ? "Calculer" : "Suivant"}
            onPress={step === 4 ? handleFinish : next}
            disabled={!canProceed()}
          />
          <NavButton label="Retour" onPress={back} variant="secondary" />
        </View>
      )}
    </SafeAreaView>
  );
}
