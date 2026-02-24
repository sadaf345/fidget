import React, { useRef, useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, Animated, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { HapticPower } from '@/types/fidget';

interface HorizontalScrollWidgetProps {
  disabled?: boolean;
  hapticPower?: HapticPower;
}

const NOTCH_COUNT = 20;
const TICK_WIDTH = 8;
const NOTCH_SPACING = 8;
const ROW_WIDTH = NOTCH_COUNT * NOTCH_SPACING;

export default function HorizontalScrollWidget({ disabled, hapticPower = 'light' }: HorizontalScrollWidgetProps) {
  const scrollRef = useRef(0);
  const lastTickRef = useRef(0);
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const [activeNotch, setActiveNotch] = useState(0);

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const hapticPowerRef = useRef(hapticPower);
  hapticPowerRef.current = hapticPower;

  const triggerTick = useCallback(() => {
    try {
      const power = hapticPowerRef.current;
      if (power === 'heavy') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      } else if (power === 'medium') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch (e) {
      console.log('Haptic not available:', e);
    }
  }, []);

  const wrapScroll = useCallback((val: number) => {
    let wrapped = val % ROW_WIDTH;
    if (wrapped > 0) wrapped -= ROW_WIDTH;
    return wrapped;
  }, []);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: (_, gs) => !disabledRef.current && Math.abs(gs.dx) > 2,
      onPanResponderGrant: () => {
        Haptics.selectionAsync().catch(() => {});
      },
      onPanResponderMove: (_evt, gestureState) => {
        const delta = gestureState.dx * 0.6;
        scrollRef.current += delta * 0.3;

        const wrapped = wrapScroll(scrollRef.current);
        scrollAnim.setValue(wrapped);

        const currentTick = Math.floor(scrollRef.current / TICK_WIDTH);
        if (currentTick !== lastTickRef.current) {
          lastTickRef.current = currentTick;
          setActiveNotch(((Math.abs(currentTick) % NOTCH_COUNT) + NOTCH_COUNT) % NOTCH_COUNT);
          triggerTick();
        }
      },
      onPanResponderRelease: () => {
        const snapped = Math.round(scrollRef.current / TICK_WIDTH) * TICK_WIDTH;
        scrollRef.current = snapped;
        const wrapped = wrapScroll(snapped);
        Animated.spring(scrollAnim, {
          toValue: wrapped,
          useNativeDriver: true,
          friction: 8,
          tension: 60,
        }).start();
      },
    }),
  [scrollAnim, triggerTick, wrapScroll]);

  const notches = Array.from({ length: NOTCH_COUNT }, (_, i) => {
    const isActive = i === activeNotch;
    return (
      <View
        key={i}
        style={[
          styles.notch,
          isActive && styles.notchActive,
          i % 5 === 0 && styles.notchMajor,
          i % 5 === 0 && isActive && styles.notchMajorActive,
        ]}
      />
    );
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.notchRow,
            {
              transform: [{ translateX: scrollAnim }],
            },
          ]}
        >
          {notches}
          {notches}
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
    gap: 6,
    height: 52,
  },
  notch: {
    width: 2,
    height: 16,
    backgroundColor: theme.textMuted,
    borderRadius: 1,
    opacity: 0.5,
  },
  notchActive: {
    backgroundColor: theme.accent,
    opacity: 1,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  notchMajor: {
    height: 24,
    width: 2.5,
    opacity: 0.7,
  },
  notchMajorActive: {
    height: 26,
    opacity: 1,
  },
  indicator: {
    position: 'absolute',
    width: 2,
    height: 40,
    backgroundColor: theme.accent,
    borderRadius: 1,
    opacity: 0.4,
  },
});
