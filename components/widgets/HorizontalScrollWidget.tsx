import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, PanResponder } from 'react-native';
import { theme } from '@/constants/colors';
import { HapticPower } from '@/types/fidget';
import { playHaptic } from '@/lib/haptics';
import { mod, releaseVelocity, Sample, startMomentum } from '@/lib/spin';

interface HorizontalScrollWidgetProps {
  disabled?: boolean;
  hapticPower?: HapticPower;
}

const NOTCH_COUNT = 20;
const NOTCH_WIDTH = 2;
const NOTCH_GAP = 6;
const TICK_WIDTH = NOTCH_WIDTH + NOTCH_GAP;
const ROW_WIDTH = NOTCH_COUNT * TICK_WIDTH;
// Three copies of the notch row so the strip loops seamlessly.
const ROW_COPIES = 3;
const SCROLL_FRICTION = 0.95;
const MAX_SCROLL_VELOCITY = 4; // px per ms
const MIN_FLICK_VELOCITY = 0.15;
const STOP_VELOCITY = 0.04;
const MIN_HAPTIC_INTERVAL_MS = 28;

export default function HorizontalScrollWidget({ disabled, hapticPower = 'light' }: HorizontalScrollWidgetProps) {
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(0);
  const lastDxRef = useRef(0);
  const lastTickRef = useRef(0);
  const lastHapticRef = useRef(0);
  const samplesRef = useRef<Sample[]>([]);
  const cancelScrollRef = useRef<(() => void) | null>(null);

  const disabledRef = useRef(disabled);
  const hapticPowerRef = useRef(hapticPower);
  useEffect(() => {
    disabledRef.current = disabled;
    hapticPowerRef.current = hapticPower;
  });

  useEffect(() => () => cancelScrollRef.current?.(), []);

  const panResponder = useMemo(() => {
    // Maps the unbounded scroll position into one row-width so the strip can loop forever.
    const wrap = (val: number) => -mod(-val, ROW_WIDTH);

    const setScroll = (val: number) => {
      scrollRef.current = val;
      scrollAnim.setValue(wrap(val));
      const tick = Math.floor(val / TICK_WIDTH);
      if (tick !== lastTickRef.current) {
        lastTickRef.current = tick;
        const now = Date.now();
        if (now - lastHapticRef.current >= MIN_HAPTIC_INTERVAL_MS) {
          lastHapticRef.current = now;
          playHaptic(hapticPowerRef.current);
        }
      }
    };

    const settle = () => {
      const snapped = Math.round(scrollRef.current / TICK_WIDTH) * TICK_WIDTH;
      // Spring by the real distance from the displayed position, so it never jumps across the loop seam.
      const target = wrap(scrollRef.current) + (snapped - scrollRef.current);
      scrollRef.current = snapped;
      Animated.spring(scrollAnim, { toValue: target, useNativeDriver: true, friction: 8, tension: 60 }).start();
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: (_, gs) => !disabledRef.current && Math.abs(gs.dx) > 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const wasScrolling = cancelScrollRef.current !== null;
        cancelScrollRef.current?.();
        cancelScrollRef.current = null;
        lastDxRef.current = 0;
        samplesRef.current = [{ t: Date.now(), value: scrollRef.current }];
        playHaptic(wasScrolling ? 'rigid' : 'selection');
      },
      onPanResponderMove: (_evt, gs) => {
        const delta = gs.dx - lastDxRef.current;
        lastDxRef.current = gs.dx;
        setScroll(scrollRef.current + delta);
        samplesRef.current.push({ t: Date.now(), value: scrollRef.current });
        if (samplesRef.current.length > 12) samplesRef.current.shift();
      },
      onPanResponderRelease: () => {
        const v = releaseVelocity(samplesRef.current, Date.now());
        if (Math.abs(v) < MIN_FLICK_VELOCITY) {
          settle();
          return;
        }
        cancelScrollRef.current = startMomentum({
          velocity: Math.max(-MAX_SCROLL_VELOCITY, Math.min(MAX_SCROLL_VELOCITY, v)),
          friction: SCROLL_FRICTION,
          minVelocity: STOP_VELOCITY,
          onStep: delta => setScroll(scrollRef.current + delta),
          onEnd: () => {
            cancelScrollRef.current = null;
            settle();
          },
        });
      },
      onPanResponderTerminate: settle,
    });
  }, [scrollAnim]);

  const notches = Array.from({ length: NOTCH_COUNT * ROW_COPIES }, (_, i) => {
    const isMajor = i % 5 === 0;
    return <View key={i} style={[styles.notch, isMajor && styles.notchMajor]} />;
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.track} pointerEvents="none">
        <Animated.View style={[styles.notchRow, { transform: [{ translateX: scrollAnim }] }]}>
          {notches}
        </Animated.View>
        <View style={styles.indicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    width: 148,
    height: 52,
    borderRadius: 14,
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: theme.widgetBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  notchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: NOTCH_GAP,
    height: 52,
  },
  notch: {
    width: NOTCH_WIDTH,
    height: 16,
    backgroundColor: theme.textMuted,
    borderRadius: 1,
    opacity: 0.5,
  },
  notchMajor: {
    height: 24,
    opacity: 0.8,
  },
  indicator: {
    position: 'absolute',
    width: 2,
    height: 40,
    backgroundColor: theme.accent,
    borderRadius: 1,
    opacity: 0.9,
  },
});
