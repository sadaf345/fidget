import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { playEvents, transient } from '@/lib/haptics';
import { useTapFeel } from '@/hooks/useTapFeel';
import ToyChrome from '@/components/ToyChrome';

const BARREL_W = 56;
const BARREL_H = 300;
const TIP_TRAVEL = 20;

export default function PenScreen() {
  const insets = useSafeAreaInsets();
  const [out, setOut] = useState(false);
  const plunger = useRef(new Animated.Value(0)).current;
  const tip = useRef(new Animated.Value(0)).current;
  const tapFeel = useTapFeel('pen');

  const click = () => {
    const next = !out;
    setOut(next);
    // Clicking in locks the tip out: a sharp click and a softer echo. Clicking out is one click.
    tapFeel(() => {
      if (next) {
        transient(0.8, 0.8);
        playEvents([{ time: 30, intensity: 0.4, sharpness: 0.6 }]);
      } else {
        transient(0.6, 0.5);
      }
    });
    plunger.setValue(1);
    Animated.spring(plunger, { toValue: 0, friction: 4, tension: 300, useNativeDriver: true }).start();
    Animated.spring(tip, { toValue: next ? 1 : 0, friction: 7, tension: 420, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPressIn={click}
          accessibilityRole="button"
          accessibilityLabel="Pen"
          accessibilityState={{ checked: out }}
          accessibilityHint="Clicks the pen"
          style={styles.pen}
        >
          <Animated.View pointerEvents="none" style={[styles.plunger, { transform: [{ translateY: plunger.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) }] }]} />
          <View pointerEvents="none">
            <Svg width={BARREL_W + 20} height={BARREL_H}>
              <Defs>
                <LinearGradient id="barrel" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#2B3A55" />
                  <Stop offset="0.45" stopColor="#4A6491" />
                  <Stop offset="1" stopColor="#1E2A40" />
                </LinearGradient>
                <LinearGradient id="clip" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#D1D5DB" />
                  <Stop offset="1" stopColor="#6B7280" />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={BARREL_W} height={BARREL_H} rx={BARREL_W / 2} fill="url(#barrel)" />
              <Rect x={10} y={20} width={6} height={BARREL_H - 60} rx={3} fill="#FFFFFF" opacity={0.18} />
              <Rect x={0} y={150} width={BARREL_W} height={70} fill="#1F2937" opacity={0.55} />
              <Path d={`M ${BARREL_W - 6} 18 h 10 a 6 6 0 0 1 6 6 v 120 a 6 6 0 0 1 -12 0 Z`} fill="url(#clip)" />
            </Svg>
          </View>
          <View pointerEvents="none" style={styles.coneWrap}>
            <Svg width={BARREL_W} height={46}>
              <Path d={`M 4 0 H ${BARREL_W - 4} L ${BARREL_W / 2 + 7} 44 H ${BARREL_W / 2 - 7} Z`} fill="#1E2A40" />
            </Svg>
            <Animated.View style={[styles.tip, { transform: [{ translateY: tip.interpolate({ inputRange: [0, 1], outputRange: [-TIP_TRAVEL, 0] }) }] }]}>
              <View style={styles.tipShaft} />
              <View style={styles.tipBall} />
            </Animated.View>
          </View>
        </Pressable>
        <Text style={styles.hint}>Tap it. Again. And again.</Text>
      </View>
      <ToyChrome toyId="pen" />
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
  pen: {
    alignItems: 'center',
    paddingHorizontal: 50,
    paddingVertical: 10,
  },
  plunger: {
    width: 30,
    height: 44,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#C7D2FE',
    marginBottom: -6,
    marginLeft: -20,
  },
  coneWrap: {
    alignItems: 'center',
    marginLeft: -20,
  },
  tip: {
    alignItems: 'center',
    marginTop: -2,
  },
  tipShaft: {
    width: 6,
    height: 18,
    backgroundColor: '#9CA3AF',
  },
  tipBall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#111827',
    marginTop: -1,
  },
  hint: {
    marginTop: 40,
    fontSize: 14,
    color: theme.textMuted,
  },
});
