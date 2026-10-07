import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, PanResponder } from 'react-native';
import { theme } from '@/constants/colors';
import { HapticPower } from '@/types/fidget';
import { playHaptic } from '@/lib/haptics';
import { angleAround, angleDelta, releaseVelocity, Sample, startMomentum } from '@/lib/spin';

interface ScrollWheelWidgetProps {
  disabled?: boolean;
  hapticPower?: HapticPower;
}

const SIZE = 140;
const CENTER = SIZE / 2;
const NOTCH_COUNT = 24;
const TICK_ANGLE = 360 / NOTCH_COUNT;
// Spin feel. Friction is velocity kept per frame: higher coasts longer.
const SPIN_FRICTION = 0.975;
const MAX_SPIN_VELOCITY = 3; // degrees per ms (~8 turns per second)
const MIN_FLICK_VELOCITY = 0.08; // slower releases just settle onto the nearest notch
const STOP_VELOCITY = 0.03;
// The Taptic Engine blurs taps closer together than this, so fast spins buzz instead of queueing.
const MIN_HAPTIC_INTERVAL_MS = 28;

export default function ScrollWheelWidget({ disabled, hapticPower = 'light' }: ScrollWheelWidgetProps) {
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const rotationRef = useRef(0);
  const lastTickRef = useRef(0);
  const lastHapticRef = useRef(0);
  const fingerAngleRef = useRef(0);
  const samplesRef = useRef<Sample[]>([]);
  const cancelSpinRef = useRef<(() => void) | null>(null);

  const disabledRef = useRef(disabled);
  const hapticPowerRef = useRef(hapticPower);
  useEffect(() => {
    disabledRef.current = disabled;
    hapticPowerRef.current = hapticPower;
  });

  useEffect(() => () => cancelSpinRef.current?.(), []);

  const panResponder = useMemo(() => {
    const setRotation = (deg: number) => {
      rotationRef.current = deg;
      rotationAnim.setValue(deg);
      const tick = Math.floor(deg / TICK_ANGLE);
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
      const snapped = Math.round(rotationRef.current / TICK_ANGLE) * TICK_ANGLE;
      rotationRef.current = snapped;
      Animated.spring(rotationAnim, { toValue: snapped, useNativeDriver: true, friction: 8, tension: 60 }).start();
    };

    const stopSpin = () => {
      cancelSpinRef.current?.();
      cancelSpinRef.current = null;
      rotationAnim.stopAnimation();
    };

    // Touches always land on the container (children ignore touches), so locationX/Y
    // are relative to the wheel's own box and its center is fixed.
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const wasSpinning = cancelSpinRef.current !== null;
        stopSpin();
        const { locationX, locationY } = evt.nativeEvent;
        fingerAngleRef.current = angleAround(CENTER, CENTER, locationX, locationY);
        samplesRef.current = [{ t: Date.now(), value: rotationRef.current }];
        playHaptic(wasSpinning ? 'rigid' : 'selection');
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const angle = angleAround(CENTER, CENTER, locationX, locationY);
        const delta = angleDelta(fingerAngleRef.current, angle);
        fingerAngleRef.current = angle;
        setRotation(rotationRef.current + delta);
        const now = Date.now();
        samplesRef.current.push({ t: now, value: rotationRef.current });
        if (samplesRef.current.length > 12) samplesRef.current.shift();
      },
      onPanResponderRelease: () => {
        const v = releaseVelocity(samplesRef.current, Date.now());
        if (Math.abs(v) < MIN_FLICK_VELOCITY) {
          settle();
          return;
        }
        cancelSpinRef.current = startMomentum({
          velocity: Math.max(-MAX_SPIN_VELOCITY, Math.min(MAX_SPIN_VELOCITY, v)),
          friction: SPIN_FRICTION,
          minVelocity: STOP_VELOCITY,
          onStep: delta => setRotation(rotationRef.current + delta),
          onEnd: () => {
            cancelSpinRef.current = null;
            settle();
          },
        });
      },
      onPanResponderTerminate: settle,
    });
  }, [rotationAnim]);

  const spin = rotationAnim.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: ['-360deg', '0deg', '360deg'],
  });

  const notches = Array.from({ length: NOTCH_COUNT }, (_, i) => (
    <View
      key={i}
      style={[styles.notchContainer, { transform: [{ rotate: `${i * TICK_ANGLE}deg` }] }]}
    >
      <View style={[styles.notch, i === 0 && styles.notchMarker]} />
    </View>
  ));

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View pointerEvents="none" style={[styles.wheel, { transform: [{ rotate: spin }] }]}>
        {notches}
        <View style={styles.centerDot} />
      </Animated.View>
      <View pointerEvents="none" style={styles.pointer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
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
  notchMarker: {
    backgroundColor: theme.accent,
    height: 14,
  },
  pointer: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: theme.accent,
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
