import React, { useRef, useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, Animated, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { HapticPower } from '@/types/fidget';

interface PressHoldWidgetProps {
  disabled?: boolean;
  hapticPower?: HapticPower;
}

export default function PressHoldWidget({ disabled, hapticPower = 'medium' }: PressHoldWidgetProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [pressing, setPressing] = useState(false);

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const hapticPowerRef = useRef(hapticPower);
  hapticPowerRef.current = hapticPower;

  const triggerHaptic = useCallback(async () => {
    try {
      const power = hapticPowerRef.current;
      if (power === 'light') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (power === 'heavy') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (e) {
      console.log('Haptic not available:', e);
    }
  }, []);

  const startPress = useCallback(() => {
    if (disabledRef.current) return;
    setPressing(true);
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      friction: 8,
    }).start();
    triggerHaptic();
  }, [scaleAnim, triggerHaptic]);

  const endPress = useCallback(() => {
    setPressing(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 100,
    }).start();
  }, [scaleAnim]);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: () => startPress(),
      onPanResponderRelease: () => endPress(),
      onPanResponderTerminate: () => endPress(),
    }),
  [startPress, endPress]);

  return (
    <View style={styles.container}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.outerRing,
          { transform: [{ scale: scaleAnim }] },
          pressing && styles.outerRingActive,
        ]}
      >
        <View style={[styles.innerSurface, pressing && styles.innerSurfaceActive]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#3A3A4A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E0E14',
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  outerRingActive: {
    borderColor: theme.accent,
    shadowOpacity: 0.5,
  },
  innerSurface: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1A1A24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerSurfaceActive: {
    backgroundColor: '#1E3A38',
  },
});
