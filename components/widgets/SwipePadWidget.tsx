import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { HapticPower } from '@/types/fidget';
import { playHaptic } from '@/lib/haptics';
import { sound } from '@/lib/sound/engine';

const MAX_OFFSET = 50;
// Pulses get closer together the farther the knob is pushed from center.
const CENTER_INTERVAL_MS = 70;
const EDGE_INTERVAL_MS = 25;

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
  const atEdgeRef = useRef(false);

  const disabledRef = useRef(disabled);
  const hapticPowerRef = useRef(hapticPower);
  useEffect(() => {
    disabledRef.current = disabled;
    hapticPowerRef.current = hapticPower;
  });

  const triggerMovementHaptic = useCallback((dx: number, dy: number, knobX: number, knobY: number) => {
    const now = Date.now();
    const atEdge = Math.abs(knobX) >= MAX_OFFSET || Math.abs(knobY) >= MAX_OFFSET;
    if (atEdge && !atEdgeRef.current) {
      playHaptic('rigid');
      sound.play('thud', { volume: 0.5 });
      hapticCooldownRef.current = now;
    }
    atEdgeRef.current = atEdge;

    const reach = Math.min(1, Math.hypot(knobX, knobY) / MAX_OFFSET);
    const interval = CENTER_INTERVAL_MS - (CENTER_INTERVAL_MS - EDGE_INTERVAL_MS) * reach;
    if (now - hapticCooldownRef.current < interval) return;

    const prevX = lastPositionRef.current.x;
    const prevY = lastPositionRef.current.y;
    if (Math.hypot(dx - prevX, dy - prevY) < 3) return;

    lastPositionRef.current = { x: dx, y: dy };
    hapticCooldownRef.current = now;
    playHaptic(hapticPowerRef.current);
    sound.play('tick', { volume: 0.3, rate: 1.2 });
  }, []);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: () => {
        Haptics.selectionAsync().catch(() => {});
        lastPositionRef.current = { x: 0, y: 0 };
        hapticCooldownRef.current = 0;
        atEdgeRef.current = false;
        Animated.timing(trailOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_evt, gestureState) => {
        const clampedX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, gestureState.dx));
        const clampedY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, gestureState.dy));

        translateX.setValue(clampedX);
        translateY.setValue(clampedY);

        triggerMovementHaptic(gestureState.dx, gestureState.dy, clampedX, clampedY);
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
