import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, StatusBar, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { continuous } from '@/lib/haptics';
import { purrIntensity } from '@/lib/squish';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import ToyChrome from '@/components/ToyChrome';

const FADE_MS = 300;
const EYES_CLOSE_MS = 2200;
const SIZE = 280;

export default function CatScreen() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [held, setHeld] = useState(false);
  const eyes = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const s = useRef({ frame: null as number | null, began: 0, releasedAt: 0, level: 0 }).current;

  // Leaving stops the loop and its vibration, even mid-hold or mid-fade.
  useFocusEffect(useCallback(() => () => {
    if (s.frame !== null) cancelAnimationFrame(s.frame);
    s.frame = null;
    continuous.stop();
  }, [s]));

  const run = () => {
    const tick = () => {
      const now = Date.now();
      const purr = purrIntensity((now - s.began) / 1000);
      // After letting go, the purr fades out over 300 ms.
      const fade = s.releasedAt ? Math.max(0, 1 - (now - s.releasedAt) / FADE_MS) : 1;
      if (fade <= 0) {
        continuous.stop();
        s.frame = null;
        return;
      }
      continuous.set(purr * fade, 0.05);
      breathe.setValue((purr - 0.3) / 0.3);
      s.frame = requestAnimationFrame(tick);
    };
    if (s.frame === null) s.frame = requestAnimationFrame(tick);
  };

  const press = () => {
    setHeld(true);
    s.began = Date.now();
    s.releasedAt = 0;
    run();
    Animated.timing(eyes, { toValue: 1, duration: reduced ? 0 : EYES_CLOSE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
  };

  const release = () => {
    setHeld(false);
    s.releasedAt = Date.now();
    Animated.timing(eyes, { toValue: 0, duration: reduced ? 0 : 500, useNativeDriver: true }).start();
  };

  const lid = eyes.interpolate({ inputRange: [0, 1], outputRange: [0.05, 1] });
  const bodyScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, reduced ? 1 : 1.02] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPressIn={press}
          onPressOut={release}
          accessibilityRole="button"
          accessibilityLabel="Cat"
          accessibilityHint="Press and hold to make it purr"
        >
          <Animated.View pointerEvents="none" style={{ width: SIZE, height: SIZE, transform: [{ scale: bodyScale }] }}>
            <CatArt />
            {/* Eyelids slide down over the eyes while held. */}
            <View style={[styles.eyeMask, { left: SIZE * 0.33 - 18, top: SIZE * 0.45 - 16 }]}>
              <Animated.View style={[styles.lid, { transform: [{ translateY: -16 }, { scaleY: lid }, { translateY: 16 }] }]} />
            </View>
            <View style={[styles.eyeMask, { left: SIZE * 0.67 - 18, top: SIZE * 0.45 - 16 }]}>
              <Animated.View style={[styles.lid, { transform: [{ translateY: -16 }, { scaleY: lid }, { translateY: 16 }] }]} />
            </View>
          </Animated.View>
        </Pressable>
        <Text style={styles.hint}>{held ? 'Purrrrr…' : 'Press and hold the cat.'}</Text>
      </View>
      <ToyChrome toyId="cat" />
    </View>
  );
}

function CatArt() {
  const s = SIZE;
  const fur = '#F4A259';
  const dark = '#C86B2A';
  return (
    <Svg width={s} height={s} viewBox="0 0 280 280">
      <Path d="M 52 110 L 62 30 L 120 78 Z" fill={fur} />
      <Path d="M 228 110 L 218 30 L 160 78 Z" fill={fur} />
      <Path d="M 66 96 L 70 50 L 104 80 Z" fill="#F9C6A0" />
      <Path d="M 214 96 L 210 50 L 176 80 Z" fill="#F9C6A0" />
      <Ellipse cx={140} cy={150} rx={110} ry={100} fill={fur} />
      <G opacity={0.55}>
        <Path d="M 140 52 L 132 82 M 140 52 L 148 82" stroke={dark} strokeWidth={6} strokeLinecap="round" />
        <Path d="M 34 150 L 64 146 M 36 172 L 62 166 M 246 150 L 216 146 M 244 172 L 218 166" stroke={dark} strokeWidth={6} strokeLinecap="round" />
      </G>
      <Ellipse cx={92} cy={126} rx={18} ry={16} fill="#2B1B10" />
      <Ellipse cx={188} cy={126} rx={18} ry={16} fill="#2B1B10" />
      <Circle cx={97} cy={120} r={5} fill="#FFFFFF" />
      <Circle cx={193} cy={120} r={5} fill="#FFFFFF" />
      <Path d="M 130 160 L 150 160 L 140 172 Z" fill="#E86A7A" />
      <Path d="M 140 172 Q 128 186 116 178 M 140 172 Q 152 186 164 178" stroke="#7A3E1D" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Line x1={70} y1={168} x2={20} y2={160} stroke="#FFF4E6" strokeWidth={3} strokeLinecap="round" />
      <Line x1={72} y1={180} x2={24} y2={186} stroke="#FFF4E6" strokeWidth={3} strokeLinecap="round" />
      <Line x1={210} y1={168} x2={260} y2={160} stroke="#FFF4E6" strokeWidth={3} strokeLinecap="round" />
      <Line x1={208} y1={180} x2={256} y2={186} stroke="#FFF4E6" strokeWidth={3} strokeLinecap="round" />
    </Svg>
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
  eyeMask: {
    position: 'absolute',
    width: 36,
    height: 32,
    overflow: 'hidden',
    borderRadius: 16,
  },
  lid: {
    width: 36,
    height: 32,
    backgroundColor: '#F4A259',
    borderBottomWidth: 3,
    borderBottomColor: '#7A3E1D',
  },
  hint: {
    marginTop: 40,
    fontSize: 15,
    color: theme.textSecondary,
    fontWeight: '600',
  },
});
