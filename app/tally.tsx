import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, StatusBar, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/colors';
import { transient } from '@/lib/haptics';
import { useTapFeel } from '@/hooks/useTapFeel';
import { useStat } from '@/hooks/useStat';
import ToyChrome from '@/components/ToyChrome';

const DIGITS = 4;
const DIGIT_H = 54;
const RESET_HOLD_MS = 1000;

/** One mechanical number wheel; it always rolls forward, 9 wrapping round to 0. */
function DigitWheel({ digit }: { digit: number }) {
  const pos = useRef(new Animated.Value(digit)).current;
  const current = useRef(digit);

  useEffect(() => {
    const from = current.current;
    current.current = digit;
    if (digit === from) return;
    // Roll forward through the wrap (9 -> 10, the second 0) and then jump back to 0.
    const target = digit < from ? digit + 10 : digit;
    Animated.timing(pos, { toValue: target, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      if (target >= 10) pos.setValue(digit);
    });
  }, [digit, pos]);

  return (
    <View style={styles.wheel}>
      <Animated.View style={{ transform: [{ translateY: Animated.multiply(pos, -DIGIT_H) }] }}>
        {Array.from({ length: 11 }, (_, i) => (
          <Text key={i} style={styles.digit} allowFontScaling={false}>{i % 10}</Text>
        ))}
      </Animated.View>
      <View pointerEvents="none" style={styles.wheelShade} />
    </View>
  );
}

export default function TallyScreen() {
  const insets = useSafeAreaInsets();
  const count = useStat('tally.count');
  const plunger = useRef(new Animated.Value(0)).current;
  const resetProgress = useRef(new Animated.Value(0)).current;
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holdingReset, setHoldingReset] = useState(false);
  const tapFeel = useTapFeel('tally');

  const value = count.value % 10 ** DIGITS;
  const digits = String(value).padStart(DIGITS, '0').split('').map(Number);

  const increment = () => {
    tapFeel(() => transient(0.6, 0.7));
    count.add(1);
    plunger.setValue(1);
    Animated.spring(plunger, { toValue: 0, friction: 4, tension: 260, useNativeDriver: true }).start();
  };

  const startReset = () => {
    setHoldingReset(true);
    resetProgress.setValue(0);
    Animated.timing(resetProgress, { toValue: 1, duration: RESET_HOLD_MS, easing: Easing.linear, useNativeDriver: true }).start();
    resetTimer.current = setTimeout(() => {
      transient(1.0, 0.2);
      count.set(0);
      setHoldingReset(false);
    }, RESET_HOLD_MS);
  };

  const cancelReset = () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = null;
    setHoldingReset(false);
    resetProgress.stopAnimation();
    Animated.timing(resetProgress, { toValue: 0, duration: 150, useNativeDriver: true }).start();
  };

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.counter}>
          <Pressable
            onPressIn={increment}
            accessibilityRole="button"
            accessibilityLabel="Count"
            accessibilityHint="Adds one"
            hitSlop={20}
            style={styles.plungerHit}
          >
            <Animated.View pointerEvents="none" style={{ alignItems: 'center', transform: [{ translateY: plunger.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }] }}>
              <View style={styles.plungerCap} />
              <View style={styles.plungerStem} />
            </Animated.View>
          </Pressable>

          <View style={styles.body}>
            <View style={styles.window} accessible accessibilityLabel={`Count ${value}`}>
              {digits.map((d, i) => <DigitWheel key={i} digit={d} />)}
            </View>
            <Pressable
              onPressIn={startReset}
              onPressOut={cancelReset}
              accessibilityRole="button"
              accessibilityLabel="Reset"
              accessibilityHint="Hold for one second to reset to zero"
              hitSlop={14}
              style={styles.resetKnob}
            >
              <Animated.View
                pointerEvents="none"
                style={[styles.resetFill, { opacity: holdingReset ? 1 : 0, transform: [{ scale: resetProgress }] }]}
              />
            </Pressable>
          </View>
          <View style={styles.ring} />
        </View>
        <Text style={styles.hint}>Tap the button to count. Hold the little knob to reset.</Text>
      </View>
      <ToyChrome toyId="tally" />
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
  counter: {
    alignItems: 'center',
  },
  plungerHit: {
    paddingHorizontal: 30,
    paddingTop: 10,
  },
  plungerCap: {
    width: 76,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D4D4D8',
    borderBottomWidth: 4,
    borderBottomColor: '#A1A1AA',
  },
  plungerStem: {
    width: 22,
    height: 30,
    backgroundColor: '#9CA3AF',
  },
  body: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#C4C4CC',
    borderWidth: 6,
    borderColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  window: {
    flexDirection: 'row',
    gap: 4,
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#18181B',
  },
  wheel: {
    width: 38,
    height: DIGIT_H,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: '#FAFAFA',
  },
  digit: {
    height: DIGIT_H,
    lineHeight: DIGIT_H,
    textAlign: 'center',
    fontSize: 36,
    fontWeight: '800',
    color: '#111111',
    fontVariant: ['tabular-nums'],
  },
  wheelShade: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  resetKnob: {
    position: 'absolute',
    right: 30,
    bottom: 54,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#A1A1AA',
    borderWidth: 3,
    borderColor: '#D4D4D8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  resetFill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F87171',
  },
  ring: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 8,
    borderColor: '#A1A1AA',
    marginTop: -8,
  },
  hint: {
    marginTop: 36,
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
