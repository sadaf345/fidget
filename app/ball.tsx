import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { continuous, playEvents } from '@/lib/haptics';
import { squeezeIntensity } from '@/lib/squish';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import ToyChrome from '@/components/ToyChrome';

const SIZE = 240;

export default function StressBallScreen() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const squeeze = useRef(new Animated.Value(0)).current;
  const s = useRef({ frame: null as number | null, began: 0 }).current;

  useEffect(() => () => {
    if (s.frame !== null) cancelAnimationFrame(s.frame);
  }, [s]);

  const press = () => {
    s.began = Date.now();
    squeeze.stopAnimation();
    const tick = () => {
      const intensity = squeezeIntensity(Date.now() - s.began);
      continuous.set(intensity, 0.2);
      squeeze.setValue((intensity - 0.2) / 0.8);
      s.frame = requestAnimationFrame(tick);
    };
    s.frame = requestAnimationFrame(tick);
  };

  const release = () => {
    if (s.frame !== null) cancelAnimationFrame(s.frame);
    s.frame = null;
    continuous.stop();
    playEvents([
      { time: 0, intensity: 0.5, sharpness: 0.4 },
      { time: 80, intensity: 0.2, sharpness: 0.3 },
    ]);
    Animated.spring(squeeze, { toValue: 0, friction: reduced ? 12 : 3, tension: 140, useNativeDriver: true }).start();
  };

  const scaleX = squeeze.interpolate({ inputRange: [-0.3, 0, 1], outputRange: [0.92, 1, 1.2] });
  const scaleY = squeeze.interpolate({ inputRange: [-0.3, 0, 1], outputRange: [1.08, 1, 0.7] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPressIn={press} onPressOut={release} accessibilityRole="button" accessibilityLabel="Stress ball" accessibilityHint="Press and hold to squeeze">
          <Animated.View pointerEvents="none" style={{ width: SIZE, height: SIZE, transform: [{ scaleX }, { scaleY }] }}>
            <Svg width={SIZE} height={SIZE}>
              <Defs>
                <RadialGradient id="ball" cx="38%" cy="32%" r="75%">
                  <Stop offset="0" stopColor="#FECACA" />
                  <Stop offset="0.45" stopColor="#F87171" />
                  <Stop offset="1" stopColor="#991B1B" />
                </RadialGradient>
              </Defs>
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 4} fill="url(#ball)" />
              <Ellipse cx={SIZE * 0.36} cy={SIZE * 0.3} rx={SIZE * 0.12} ry={SIZE * 0.07} fill="#FFFFFF" opacity={0.45} />
            </Svg>
          </Animated.View>
        </Pressable>
        <View style={styles.shadow} />
        <Text style={styles.hint}>Squeeze and hold. Let go.</Text>
      </View>
      <ToyChrome toyId="ball" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    width: SIZE * 0.7,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginTop: 8,
  },
  hint: {
    marginTop: 36,
    fontSize: 15,
    color: theme.textSecondary,
    fontWeight: '600',
  },
});
