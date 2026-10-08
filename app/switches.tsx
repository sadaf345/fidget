import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, GestureResponderEvent, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/colors';
import { continuous, transient } from '@/lib/haptics';
import { useTapFeel } from '@/hooks/useTapFeel';
import ToyChrome from '@/components/ToyChrome';

type SwitchKind = 'blue' | 'brown' | 'red' | 'topre';

const KEYS: { kind: SwitchKind; name: string; line: string; color: string }[] = [
  { kind: 'blue', name: 'Blue', line: 'Clicky. Click down, clack up.', color: '#60A5FA' },
  { kind: 'brown', name: 'Brown', line: 'Tactile bump, no click.', color: '#B08968' },
  { kind: 'red', name: 'Red', line: 'Linear. Smooth thud.', color: '#F87171' },
  { kind: 'topre', name: 'Topre', line: 'Rubber dome. Deep thock.', color: '#E5E7EB' },
];

// Haptic values from the spec (intensity / sharpness), tuned on device.
function pressFeel(kind: SwitchKind) {
  switch (kind) {
    case 'blue': transient(0.6, 0.9); break;
    case 'brown': transient(0.4, 0.4); break;
    case 'red': transient(0.5, 0.3); break;
    case 'topre':
      // A short cushioned push, then the thock.
      continuous.set(0.5, 0.2);
      setTimeout(() => {
        continuous.stop();
        transient(0.6, 0.3);
      }, 40);
      break;
  }
}

function releaseFeel(kind: SwitchKind) {
  switch (kind) {
    case 'blue': transient(0.5, 1.0); break;
    case 'brown': transient(0.3, 0.5); break;
    case 'red': break;
    case 'topre': transient(0.3, 0.2); break;
  }
}

function Keycap({ spec, size, onPress, onRelease }: {
  spec: (typeof KEYS)[number];
  size: number;
  onPress: (kind: SwitchKind) => void;
  onRelease: (kind: SwitchKind) => void;
}) {
  const travel = useRef(new Animated.Value(0)).current;
  // Several fingers can rest on one key; it's down while any of them is.
  const touches = useRef(new Set<string>()).current;

  const down = () => {
    onPress(spec.kind);
    Animated.timing(travel, { toValue: 1, duration: 45, useNativeDriver: true }).start();
  };
  const up = () => {
    onRelease(spec.kind);
    Animated.spring(travel, { toValue: 0, friction: 5, tension: 260, useNativeDriver: true }).start();
  };

  const handleStart = (e: GestureResponderEvent) => {
    const wasUp = touches.size === 0;
    e.nativeEvent.changedTouches.forEach(t => touches.add(String(t.identifier)));
    if (wasUp && touches.size > 0) down();
  };
  const handleEnd = (e: GestureResponderEvent) => {
    if (touches.size === 0) return;
    e.nativeEvent.changedTouches.forEach(t => touches.delete(String(t.identifier)));
    if (touches.size === 0) up();
  };

  const translateY = travel.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
  const shadowDepth = travel.interpolate({ inputRange: [0, 1], outputRange: [6, 2] });

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <View
        style={{ width: size, height: size }}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${spec.name} switch`}
        accessibilityHint={spec.line}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={() => {
          down();
          setTimeout(up, 120);
        }}
      >
        <View pointerEvents="none" style={[styles.keyBase, { width: size, height: size, borderRadius: size * 0.16 }]} />
        <Animated.View
          pointerEvents="none"
          style={[styles.keyShadow, { width: size - 8, height: size - 8, borderRadius: size * 0.14, transform: [{ translateY: shadowDepth }] }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.keycap, { width: size - 8, height: size - 8, borderRadius: size * 0.14, transform: [{ translateY }] }]}
        >
          <View style={[styles.keyTop, { borderRadius: size * 0.11 }]}>
            <View style={[styles.stem, { backgroundColor: spec.color }]} />
            <Text style={styles.keyName} maxFontSizeMultiplier={1.3}>{spec.name}</Text>
          </View>
        </Animated.View>
      </View>
      <Text style={styles.keyLine} maxFontSizeMultiplier={1.4}>{spec.line}</Text>
    </View>
  );
}

export default function SwitchTesterScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const size = Math.min((width - 24 * 2 - 20) / 2, 190);
  const tapFeel = useTapFeel('switches');

  const handlePress = useCallback((kind: SwitchKind) => tapFeel(() => pressFeel(kind)), [tapFeel]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.grid}>
          {KEYS.map(spec => (
            <Keycap key={spec.kind} spec={spec} size={size} onPress={handlePress} onRelease={releaseFeel} />
          ))}
        </View>
        <Text style={styles.hint}>Press and hold. Try several at once.</Text>
      </View>
      <ToyChrome toyId="switches" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  keyBase: {
    position: 'absolute',
    backgroundColor: '#0B0B10',
    borderWidth: 1,
    borderColor: theme.border,
  },
  keyShadow: {
    position: 'absolute',
    left: 4,
    top: 4,
    backgroundColor: '#05050A',
  },
  keycap: {
    position: 'absolute',
    left: 4,
    top: 0,
    backgroundColor: '#2A2A38',
    padding: 7,
  },
  keyTop: {
    flex: 1,
    backgroundColor: '#353547',
    borderWidth: 1,
    borderColor: '#45455A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stem: {
    width: 22,
    height: 22,
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
    opacity: 0.9,
  },
  keyName: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
  },
  keyLine: {
    marginTop: 10,
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  hint: {
    marginTop: 36,
    fontSize: 14,
    color: theme.textMuted,
  },
});
