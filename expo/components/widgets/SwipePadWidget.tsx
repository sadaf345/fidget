import React, { useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Animated, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { HapticPower } from '@/types/fidget';

interface SwipePadWidgetProps {
  disabled?: boolean;
  hapticPower?: HapticPower;
}

export default function SwipePadWidget({ disabled, hapticPower = 'medium' }: SwipePadWidgetProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const trailOpacity = useRef(new Animated.Value(0)).current;
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const hapticCooldownRef = useRef(0);

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const hapticPowerRef = useRef(hapticPower);
  hapticPowerRef.current = hapticPower;

  const triggerMovementHaptic = useCallback((dx: number, dy: number) => {
    const now = Date.now();
    if (now - hapticCooldownRef.current < 40) return;

    const prevX = lastPositionRef.current.x;
    const prevY = lastPositionRef.current.y;
    const moveDelta = Math.sqrt((dx - prevX) ** 2 + (dy - prevY) ** 2);

    if (moveDelta < 3) return;

    lastPositionRef.current = { x: dx, y: dy };
    hapticCooldownRef.current = now;

    const power = hapticPowerRef.current;
    try {
      switch (power) {
        case 'light': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); break;
        case 'heavy': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); break;
        case 'soft': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {}); break;
        case 'rigid': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {}); break;
        case 'success': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); break;
        case 'warning': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); break;
        case 'error': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); break;
        case 'selection': Haptics.selectionAsync().catch(() => {}); break;
        default: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); break;
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
        lastPositionRef.current = { x: 0, y: 0 };
        hapticCooldownRef.current = 0;
        Animated.timing(trailOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_evt, gestureState) => {
        const maxOffset = 50;
        const clampedX = Math.max(-maxOffset, Math.min(maxOffset, gestureState.dx));
        const clampedY = Math.max(-maxOffset, Math.min(maxOffset, gestureState.dy));

        translateX.setValue(clampedX);
        translateY.setValue(clampedY);

        triggerMovementHaptic(gestureState.dx, gestureState.dy);
      },
      onPanResponderRelease: () => {
        lastPositionRef.current = { x: 0, y: 0 };
        hapticCooldownRef.current = 0;

        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 5,
          tension: 120,
        }).start();

        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 5,
          tension: 120,
        }).start();

        Animated.timing(trailOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      },
    }),
  [translateX, translateY, trailOpacity, triggerMovementHaptic]);

  return (
    <View style={styles.container}>
      <View style={styles.trackArea}>
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.knob,
            {
              transform: [
                { translateX },
                { translateY },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.knobGlow,
              { opacity: trailOpacity },
            ]}
          />
          <View style={styles.knobInner} />
        </Animated.View>
      </View>
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
  trackArea: {
    width: 126,
    height: 126,
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: theme.widgetBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  crosshairH: {
    position: 'absolute',
    width: '60%',
    height: 1,
    backgroundColor: theme.textMuted,
    opacity: 0.3,
  },
  crosshairV: {
    position: 'absolute',
    width: 1,
    height: '60%',
    backgroundColor: theme.textMuted,
    opacity: 0.3,
  },
  knob: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1.5,
    borderColor: theme.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  knobGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.accentGlow,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  knobInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.textMuted,
  },
});
