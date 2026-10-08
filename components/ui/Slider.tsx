import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { theme } from '@/constants/colors';
import { playHaptic } from '@/lib/haptics';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  color?: string;
}

/** A labeled slider with a live value, a selection tick per step, and VoiceOver adjust support. */
export default function Slider({ label, value, min, max, step, onChange, format = v => v.toFixed(2), color = theme.accent }: SliderProps) {
  const [width, setWidth] = useState(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const snap = (v: number) => Math.max(min, Math.min(max, Math.round((v - min) / step) * step + min));

  const panResponder = useMemo(() => {
    const fromX = (x: number) => snap(min + (Math.max(0, Math.min(width, x)) / (width || 1)) * (max - min));
    const move = (x: number) => {
      const next = fromX(x);
      if (Math.abs(next - valueRef.current) > step / 2) {
        playHaptic('selection', { raw: true });
        onChange(Number(next.toFixed(4)));
      }
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: evt => move(evt.nativeEvent.locationX),
      onPanResponderMove: evt => move(evt.nativeEvent.locationX),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, min, max, step, onChange]);

  const fraction = (value - min) / (max - min);
  const thumbX = fraction * width;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={e => onChange(snap(value + (e.nativeEvent.actionName === 'increment' ? step : -step)))}
    >
      <View style={styles.labelRow}>
        <Text style={styles.label} maxFontSizeMultiplier={1.4}>{label}</Text>
        <Text style={styles.value} maxFontSizeMultiplier={1.4}>{format(value)}</Text>
      </View>
      <View
        style={styles.hitArea}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View pointerEvents="none" style={styles.track}>
          <View style={[styles.fill, { width: thumbX, backgroundColor: color }]} />
        </View>
        <View pointerEvents="none" style={[styles.thumb, { left: thumbX - 12, borderColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  hitArea: {
    height: 36,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.border,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.text,
    borderWidth: 3,
  },
});
