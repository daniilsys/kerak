import { useRef, useEffect } from "react";
import { Animated, Dimensions, Easing } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

export function useFadeIn(delay = 0, duration = 400, translateYStart = 14) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(translateYStart)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  return { opacity, transform: [{ translateY }] };
}

export function useSlideIn(duration = 300) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(SCREEN_WIDTH * 0.15)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  return { opacity, transform: [{ translateX }] };
}

export function useStaggerFade(count: number, baseDelay = 150) {
  const anims = useRef(
    Array.from({ length: count }, () => new Animated.Value(0)),
  ).current;
  const translateYs = useRef(
    Array.from({ length: count }, () => new Animated.Value(18)),
  ).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay: i * baseDelay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateYs[i], {
          toValue: 0,
          duration: 400,
          delay: i * baseDelay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    Animated.stagger(0, animations).start();
  }, []);

  return anims.map((opacity, i) => ({
    opacity,
    transform: [{ translateY: translateYs[i] }],
  }));
}
