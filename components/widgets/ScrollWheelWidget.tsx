import React, { useRef, useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, Animated, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { HapticPower } from '@/types/fidget';

interface ScrollWheelWidgetProps {
  disabled?: boolean;
  hapticPower?: HapticPower;
}

const NOTCH_COUNT = 24;
const TICK_ANGLE = 360 / NOTCH_COUNT;

export default function ScrollWheelWidget({ disabled, hapticPower = 'light' }: ScrollWheelWidgetProps) {
  const rotationRef = useRef(0);
  const lastTickRef = useRef(0);
  const rotationAnim = useRef(new Animated.Value(0)).current;
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

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: () => {
        Haptics.selectionAsync().catch(() => {});
      },
      onPanResponderMove: (_evt, gestureState) => {
        const delta = gestureState.dy * 0.8 + gestureState.dx * 0.3;
        rotationRef.current += delta * 0.5;
        rotationAnim.setValue(rotationRef.current);

        const currentTick = Math.floor(rotationRef.current / TICK_ANGLE);
        if (currentTick !== lastTickRef.current) {
          lastTickRef.current = currentTick;
          setActiveNotch(Math.abs(currentTick) % NOTCH_COUNT);
          triggerTick();
        }
      },
      onPanResponderRelease: () => {
        const snappedRotation = Math.round(rotationRef.current / TICK_ANGLE) * TICK_ANGLE;
        rotationRef.current = snappedRotation;
        Animated.spring(rotationAnim, {
          toValue: snappedRotation,
          useNativeDriver: true,
          friction: 8,
          tension: 60,
        }).start();
      },
    }),
  [rotationAnim, triggerTick]);

  const spin = rotationAnim.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: ['-360deg', '0deg', '360deg'],
  });

  const notches = Array.from({ length: NOTCH_COUNT }, (_, i) => {
    const angle = (i * 360) / NOTCH_COUNT;
    const isActive = i === activeNotch;
    return (
      <View
        key={i}
        style={[
          styles.notchContainer,
          { transform: [{ rotate: `${angle}deg` }] },
        ]}
      >
        <View
          style={[
            styles.notch,
            isActive && styles.notchActive,
          ]}
        />
      </View>
    );
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.wheel,
          { transform: [{ rotate: spin }] },
        ]}
      >
        {notches}
        <View style={styles.centerDot} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheel: {
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: theme.widgetBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  notchContainer: {
    position: 'absolute',
    width: 126,
    height: 126,
    alignItems: 'center',
  },
  notch: {
    width: 3,
    height: 12,
    backgroundColor: theme.textMuted,
    borderRadius: 1.5,
    marginTop: 6,
  },
  notchActive: {
    backgroundColor: theme.accent,
    height: 14,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  centerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1.5,
    borderColor: theme.borderLight,
  },
});
