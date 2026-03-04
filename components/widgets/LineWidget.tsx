import React, { useRef, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Animated, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { HapticPower, LineThickness } from '@/types/fidget';

interface LineWidgetProps {
  disabled?: boolean;
  hapticPower?: HapticPower;
  lineThickness?: LineThickness;
  hasSlider?: boolean;
}

const SLIDER_SIZE = 28;
const LINE_WIDTH = 200;

function triggerHapticForPower(power: HapticPower) {
  switch (power) {
    case 'light': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); break;
    case 'medium': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); break;
    case 'heavy': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); break;
    case 'soft': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {}); break;
    case 'rigid': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {}); break;
    case 'success': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); break;
    case 'warning': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); break;
    case 'error': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); break;
    case 'selection': Haptics.selectionAsync().catch(() => {}); break;
  }
}

export default function LineWidget({ disabled, hapticPower = 'medium', lineThickness = 2, hasSlider = false }: LineWidgetProps) {
  const sliderX = useRef(new Animated.Value(0)).current;
  const sliderStartX = useRef(0);
  const lastHapticTime = useRef(0);
  const lastMoveTime = useRef(0);
  const lastMoveX = useRef(0);
  const [sliderActive, setSliderActive] = useState(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const hapticPowerRef = useRef(hapticPower);
  hapticPowerRef.current = hapticPower;

  const maxSliderX = LINE_WIDTH - SLIDER_SIZE;

  const getHapticInterval = useCallback((speed: number): number => {
    if (speed < 50) return 200;
    if (speed < 150) return 120;
    if (speed < 300) return 70;
    return 40;
  }, []);

  const sliderPanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current && hasSlider,
      onMoveShouldSetPanResponder: (_, gs) => !disabledRef.current && hasSlider && Math.abs(gs.dx) > 2,
      onStartShouldSetPanResponderCapture: () => !disabledRef.current && hasSlider,
      onMoveShouldSetPanResponderCapture: (_, gs) => !disabledRef.current && hasSlider && Math.abs(gs.dx) > 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        setSliderActive(true);
        triggerHapticForPower(hapticPowerRef.current);
        lastMoveTime.current = Date.now();
        lastMoveX.current = sliderStartX.current;
      },
      onPanResponderMove: (_, gs) => {
        const newX = Math.max(0, Math.min(maxSliderX, sliderStartX.current + gs.dx));
        sliderX.setValue(newX);

        const now = Date.now();
        const dt = now - lastMoveTime.current;
        if (dt > 0) {
          const speed = Math.abs(newX - lastMoveX.current) / dt * 1000;
          const interval = getHapticInterval(speed);
          if (now - lastHapticTime.current >= interval) {
            triggerHapticForPower(hapticPowerRef.current);
            lastHapticTime.current = now;
          }
        }
        lastMoveTime.current = now;
        lastMoveX.current = newX;
      },
      onPanResponderRelease: (_, gs) => {
        const newX = Math.max(0, Math.min(maxSliderX, sliderStartX.current + gs.dx));
        sliderStartX.current = newX;
        setSliderActive(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      },
      onPanResponderTerminate: (_, gs) => {
        const newX = Math.max(0, Math.min(maxSliderX, sliderStartX.current + gs.dx));
        sliderStartX.current = newX;
        setSliderActive(false);
      },
    }),
  [sliderX, maxSliderX, hasSlider, getHapticInterval]);

  const effectiveThickness = Math.max(lineThickness, 0.5);
  const containerHeight = hasSlider ? Math.max(SLIDER_SIZE + 8, effectiveThickness + 16) : Math.max(20, effectiveThickness + 16);

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      <View
        style={[
          styles.line,
          {
            height: effectiveThickness,
            borderRadius: effectiveThickness / 2,
          },
        ]}
      />
      {hasSlider && (
        <Animated.View
          {...sliderPanResponder.panHandlers}
          style={[
            styles.slider,
            sliderActive && styles.sliderActive,
            {
              transform: [{ translateX: sliderX }],
            },
          ]}
        >
          <View style={[styles.sliderInner, sliderActive && styles.sliderInnerActive]} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: LINE_WIDTH,
    justifyContent: 'center',
    position: 'relative',
  },
  line: {
    width: '100%',
    backgroundColor: theme.textSecondary,
  },
  slider: {
    position: 'absolute',
    width: SLIDER_SIZE,
    height: SLIDER_SIZE,
    borderRadius: SLIDER_SIZE / 2,
    backgroundColor: '#0E0E14',
    borderWidth: 2,
    borderColor: '#3A3A4A',
    alignItems: 'center',
    justifyContent: 'center',
    top: '50%',
    marginTop: -SLIDER_SIZE / 2,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sliderActive: {
    borderColor: theme.accent,
    shadowOpacity: 0.5,
  },
  sliderInner: {
    width: SLIDER_SIZE - 10,
    height: SLIDER_SIZE - 10,
    borderRadius: (SLIDER_SIZE - 10) / 2,
    backgroundColor: '#1A1A24',
  },
  sliderInnerActive: {
    backgroundColor: '#1E3A38',
  },
});
