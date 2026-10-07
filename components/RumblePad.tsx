import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { coreHaptics } from '@/lib/coreHaptics';

const HEIGHT = 200;

/**
 * Drag to play the continuous haptic engine directly: up = stronger, right = sharper.
 * In Expo Go (taps only) it explains that rich haptics need our own build instead.
 */
export default function RumblePad() {
  const { width: screenWidth } = useWindowDimensions();
  const width = screenWidth - 32;
  const [touch, setTouch] = useState<{ x: number; y: number } | null>(null);
  const available = coreHaptics.available;

  const panResponder = useMemo(() => {
    const play = (x: number, y: number, tap: boolean) => {
      const sharpness = Math.max(0, Math.min(1, x / width));
      const strength = Math.max(0, Math.min(1, 1 - y / HEIGHT));
      if (tap) coreHaptics.tap(strength, sharpness);
      coreHaptics.set(strength, sharpness);
      setTouch({ x, y });
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: evt => play(evt.nativeEvent.locationX, evt.nativeEvent.locationY, true),
      onPanResponderMove: evt => play(evt.nativeEvent.locationX, evt.nativeEvent.locationY, false),
      onPanResponderRelease: () => {
        coreHaptics.stop();
        setTouch(null);
      },
      onPanResponderTerminate: () => {
        coreHaptics.stop();
        setTouch(null);
      },
    });
  }, [width]);

  if (!available) {
    return (
      <View style={styles.offCard}>
        <Text style={styles.offTitle}>Rich haptics: off</Text>
        <Text style={styles.offText}>
          {"You're in Expo Go, which can only play taps."} The fidget build of the app turns on Core Haptics:
          continuous vibration that swells and fades.
        </Text>
      </View>
    );
  }

  const strength = touch ? 1 - touch.y / HEIGHT : 0;
  const sharpness = touch ? touch.x / width : 0;

  return (
    <View>
      <View style={[styles.pad, { width, height: HEIGHT }]} {...panResponder.panHandlers}>
        <Svg width={width} height={HEIGHT} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="sharp" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#6366F1" stopOpacity={0.35} />
              <Stop offset="1" stopColor={theme.accent} stopOpacity={0.35} />
            </LinearGradient>
            <LinearGradient id="strong" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.55} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width={width} height={HEIGHT} fill="url(#sharp)" />
          <Rect width={width} height={HEIGHT} fill="url(#strong)" />
        </Svg>
        <Text pointerEvents="none" style={[styles.axis, styles.axisTop]}>stronger ↑</Text>
        <Text pointerEvents="none" style={[styles.axis, styles.axisRight]}>sharper →</Text>
        {touch && <View pointerEvents="none" style={[styles.dot, { left: touch.x - 14, top: touch.y - 14 }]} />}
      </View>
      <Text style={styles.readout}>
        {touch
          ? `strength ${Math.max(0, strength).toFixed(2)} · sharpness ${Math.min(1, sharpness).toFixed(2)}`
          : 'Drag around the pad'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.surface,
  },
  axis: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  axisTop: {
    top: 10,
    left: 12,
  },
  axisRight: {
    bottom: 10,
    right: 12,
  },
  dot: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    opacity: 0.85,
  },
  readout: {
    marginTop: 8,
    fontSize: 12,
    color: theme.textMuted,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  offCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 6,
  },
  offTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  offText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.textSecondary,
  },
});
