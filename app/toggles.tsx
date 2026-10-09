import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Pressable, StatusBar, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RotateCcw } from 'lucide-react-native';
import { theme } from '@/constants/colors';
import { transient } from '@/lib/haptics';
import { useTapFeel } from '@/hooks/useTapFeel';
import { sound } from '@/lib/sound/engine';
import ToyChrome from '@/components/ToyChrome';

type Kind = 'toggle' | 'light' | 'rocker';

const COLS = 4;
const ROWS = 5;
const COUNT = COLS * ROWS;
// A fixed mix so the wall always looks the same.
const KINDS: Kind[] = Array.from({ length: COUNT }, (_, i) => (['toggle', 'light', 'rocker'] as Kind[])[(i * 7 + Math.floor(i / COLS)) % 3]);
const CASCADE_GAP_MS = 45;

export default function ToggleWallScreen() {
  const insets = useSafeAreaInsets();
  const [on, setOn] = useState<boolean[]>(() => Array(COUNT).fill(false));
  const onRef = useRef(on);
  const anims = useRef(Array.from({ length: COUNT }, () => new Animated.Value(0))).current;
  const [grid, setGrid] = useState({ width: 0, height: 0 });
  const visited = useRef(new Set<number>());
  const tapFeel = useTapFeel('toggles');

  const flip = useCallback((index: number) => {
    const next = onRef.current.slice();
    next[index] = !next[index];
    onRef.current = next;
    setOn(next);
    const rocker = KINDS[index] === 'rocker';
    tapFeel(() => (next[index] ? transient(0.7, rocker ? 0.4 : 0.8) : transient(0.6, rocker ? 0.4 : 0.6)));
    // Each kind has its own sound; on is pitched a touch higher than off.
    const kind = KINDS[index];
    sound.play(kind === 'toggle' ? 'toggle' : kind === 'light' ? 'lightSwitch' : 'rocker', { rate: next[index] ? 1.06 : 0.94 });
    Animated.spring(anims[index], { toValue: next[index] ? 1 : 0, friction: 7, tension: 320, useNativeDriver: true }).start();
  }, [anims, tapFeel]);

  const cellAt = useCallback((x: number, y: number) => {
    if (grid.width === 0) return -1;
    const col = Math.floor((x / grid.width) * COLS);
    const row = Math.floor((y / grid.height) * ROWS);
    return col < 0 || row < 0 || col >= COLS || row >= ROWS ? -1 : row * COLS + col;
  }, [grid]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: evt => {
      visited.current = new Set();
      const i = cellAt(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      if (i >= 0) {
        visited.current.add(i);
        flip(i);
      }
    },
    // Dragging across the wall flips each switch the finger enters, once.
    onPanResponderMove: evt => {
      const i = cellAt(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      if (i >= 0 && !visited.current.has(i)) {
        visited.current.add(i);
        flip(i);
      }
    },
  }), [cellAt, flip]);

  const resetAll = () => {
    const lit = onRef.current.map((v, i) => (v ? i : -1)).filter(i => i >= 0);
    lit.forEach((i, k) => setTimeout(() => {
      if (onRef.current[i]) flip(i);
    }, k * CASCADE_GAP_MS));
  };

  const cellW = grid.width / COLS;
  const cellH = grid.height / ROWS;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 16 }]}>
        <View
          style={styles.grid}
          onLayout={(e: LayoutChangeEvent) => setGrid({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          {...panResponder.panHandlers}
          accessibilityLabel="Toggle wall"
        >
          {grid.width > 0 && KINDS.map((kind, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={[styles.cell, { left: (i % COLS) * cellW, top: Math.floor(i / COLS) * cellH, width: cellW, height: cellH }]}
              accessible
              accessibilityRole="switch"
              accessibilityState={{ checked: on[i] }}
              accessibilityLabel={`${kind === 'toggle' ? 'Toggle' : kind === 'light' ? 'Light switch' : 'Rocker'} ${i + 1}`}
              accessibilityActions={[{ name: 'activate' }]}
              onAccessibilityAction={() => flip(i)}
            >
              {kind === 'toggle' && <IosToggle anim={anims[i]} />}
              {kind === 'light' && <LightSwitch anim={anims[i]} />}
              {kind === 'rocker' && <Rocker anim={anims[i]} />}
            </View>
          ))}
        </View>
        <Pressable onPress={resetAll} style={({ pressed }) => [styles.reset, pressed && { opacity: 0.6 }]} accessibilityRole="button">
          <RotateCcw size={16} color={theme.text} />
          <Text style={styles.resetText}>Reset all</Text>
        </Pressable>
      </View>
      <ToyChrome toyId="toggles" />
    </View>
  );
}

function IosToggle({ anim }: { anim: Animated.Value }) {
  return (
    <View style={styles.toggleTrack}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.toggleOn, { opacity: anim }]} />
      <Animated.View style={[styles.toggleKnob, { transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [2, 26] }) }] }]} />
    </View>
  );
}

function LightSwitch({ anim }: { anim: Animated.Value }) {
  return (
    <View style={styles.plate}>
      <View style={styles.slot}>
        <Animated.View
          style={[styles.lever, { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, -10] }) }] }]}
        />
      </View>
      <Animated.View style={[styles.lamp, { opacity: anim }]} />
    </View>
  );
}

function Rocker({ anim }: { anim: Animated.Value }) {
  return (
    <View style={styles.rockerFrame}>
      <Animated.View
        style={[
          styles.rocker,
          { transform: [{ perspective: 300 }, { rotateX: anim.interpolate({ inputRange: [0, 1], outputRange: ['18deg', '-18deg'] }) }] },
        ]}
      >
        <Text style={styles.rockerMark}>I</Text>
        <Text style={styles.rockerMark}>O</Text>
      </Animated.View>
      <Animated.View style={[styles.rockerGlow, { opacity: anim }]} />
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
    paddingHorizontal: 18,
    gap: 16,
  },
  grid: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTrack: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3A3A4C',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  toggleOn: {
    backgroundColor: '#34C759',
  },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  plate: {
    width: 46,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#E7E5E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: {
    width: 16,
    height: 34,
    borderRadius: 4,
    backgroundColor: '#A8A29E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lever: {
    width: 12,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#D6D3D1',
  },
  lamp: {
    position: 'absolute',
    top: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FBBF24',
  },
  rockerFrame: {
    width: 40,
    height: 62,
    borderRadius: 8,
    backgroundColor: '#18181B',
    borderWidth: 2,
    borderColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rocker: {
    width: 30,
    height: 52,
    borderRadius: 5,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  rockerMark: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FECACA',
  },
  rockerGlow: {
    position: 'absolute',
    width: 30,
    height: 52,
    borderRadius: 5,
    backgroundColor: 'rgba(248,113,113,0.35)',
  },
  reset: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
});
