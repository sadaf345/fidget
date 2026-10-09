import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Pressable, StatusBar, useWindowDimensions, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCcw } from 'lucide-react-native';
import { theme } from '@/constants/colors';
import { playHaptic, playSequence } from '@/lib/haptics';
import { cellAt, layoutGrid } from '@/lib/pop';
import { sound } from '@/lib/sound/engine';
import { mixColor } from '@/lib/color';
import { useStat } from '@/hooks/useStat';
import ToyChrome from '@/components/ToyChrome';

const ROW_COLORS = ['#FF6B6B', '#FF9F43', '#FECA57', '#A3E635', '#1DD1A1', '#2ED3D3', '#54A0FF', '#7C6CF2', '#FF7EC8'];
const SIDE_MARGIN = 16;
// Each row pops on a note of the major pentatonic scale, low at the bottom, high at the top,
// so sweeping across the sheet plays a little melody and no combination ever sounds wrong.
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const popRate = (row: number, rows: number) => 0.8 * Math.pow(2, PENTATONIC[Math.max(0, rows - 1 - row) % PENTATONIC.length] / 12);

export default function PopScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { value: pops, add: addPops } = useStat('pop.pops');
  const { value: flips, add: addFlips } = useStat('pop.flips');

  const layout = useMemo(() => {
    const available = height - insets.top - 64 - insets.bottom - 96;
    return layoutGrid(width - SIDE_MARGIN * 2, available);
  }, [width, height, insets.top, insets.bottom]);
  const count = layout.cols * layout.rows;

  const [popped, setPopped] = useState<boolean[]>(() => Array(count).fill(false));
  const poppedRef = useRef(popped);
  const squash = useRef<Animated.Value[]>([]).current;
  while (squash.length < count) squash.push(new Animated.Value(1));
  const flip = useRef(new Animated.Value(0)).current;
  const flipping = useRef(false);
  const lastCell = useRef(-1);

  const setPoppedBoth = useCallback((next: boolean[]) => {
    poppedRef.current = next;
    setPopped(next);
  }, []);

  useEffect(() => {
    if (poppedRef.current.length !== count) setPoppedBoth(Array(count).fill(false));
  }, [count, setPoppedBoth]);

  const flipSheet = useCallback(() => {
    if (flipping.current) return;
    flipping.current = true;
    playSequence([
      { at: 0, power: 'light' },
      { at: 45, power: 'light' },
      { at: 90, power: 'medium' },
      { at: 200, power: 'success' },
      { at: 340, power: 'soft' },
    ]);
    sound.play('flip');
    sound.play('reward', { volume: 0.5, delay: 300 });
    Animated.timing(flip, { toValue: 1, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      // Edge-on to the viewer: swap to the fresh side, then finish turning.
      setPoppedBoth(Array(count).fill(false));
      flip.setValue(-1);
      Animated.timing(flip, { toValue: 0, duration: 260, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start(() => {
        flipping.current = false;
      });
    });
    addFlips();
  }, [flip, count, setPoppedBoth, addFlips]);

  const popCell = useCallback((index: number, direct: boolean) => {
    if (index < 0 || flipping.current) return;
    if (poppedRef.current[index]) {
      if (direct) {
        playHaptic('soft');
        sound.play('dud', { volume: 0.6 });
      }
      return;
    }
    playSequence([
      { at: 0, power: 'rigid' },
      { at: 18, power: 'soft' },
    ]);
    sound.play('pop', { rate: popRate(Math.floor(index / layout.cols), layout.rows), vary: 0.015 });
    squash[index].setValue(0.8);
    Animated.spring(squash[index], { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start();
    const next = poppedRef.current.slice();
    next[index] = true;
    setPoppedBoth(next);
    addPops();
    if (next.every(Boolean)) setTimeout(flipSheet, 260);
  }, [squash, setPoppedBoth, addPops, flipSheet, layout.cols, layout.rows]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (evt) => {
      const index = cellAt(layout, evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      lastCell.current = index;
      popCell(index, true);
    },
    onPanResponderMove: (evt) => {
      // Dragging across pops every bubble the finger slides onto.
      const index = cellAt(layout, evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      if (index !== lastCell.current) {
        lastCell.current = index;
        popCell(index, false);
      }
    },
    onPanResponderRelease: () => {
      lastCell.current = -1;
    },
  }), [layout, popCell]);

  const rotateY = flip.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-90deg', '0deg', '90deg'] });
  const remaining = popped.filter(p => !p).length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.stage, { paddingTop: insets.top + 64 }]}>
        <Animated.View
          style={[styles.sheet, { width: layout.width, height: layout.height, transform: [{ perspective: 900 }, { rotateY }] }]}
          {...panResponder.panHandlers}
        >
          {Array.from({ length: layout.rows }, (_, row) => {
            const step = layout.size + layout.gap;
            const y0 = row === 0 ? 0 : layout.pad + row * step - layout.gap / 2;
            const y1 = row === layout.rows - 1 ? layout.height : layout.pad + (row + 1) * step - layout.gap / 2;
            return (
              <View
                key={row}
                pointerEvents="none"
                style={[styles.band, { top: y0, height: y1 - y0, backgroundColor: mixColor(ROW_COLORS[row % ROW_COLORS.length], '#000000', 0.08) }]}
              />
            );
          })}
          {popped.map((isPopped, i) => (
            <Bubble
              key={i}
              popped={isPopped}
              color={ROW_COLORS[Math.floor(i / layout.cols) % ROW_COLORS.length]}
              size={layout.size}
              left={layout.pad + (i % layout.cols) * (layout.size + layout.gap)}
              top={layout.pad + Math.floor(i / layout.cols) * (layout.size + layout.gap)}
              squash={squash[i]}
            />
          ))}
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
        <Text style={styles.footerText}>{remaining} left · {flips} flips</Text>
        <Pressable
          onPress={flipSheet}
          style={({ pressed }) => [styles.flipButton, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <RefreshCcw size={16} color={theme.text} />
          <Text style={styles.flipText}>Flip</Text>
        </Pressable>
      </View>
      <ToyChrome toyId="pop" stat={`${pops} pops`} />
    </View>
  );
}

const Bubble = React.memo(function Bubble({ popped, color, size, left, top, squash }: {
  popped: boolean;
  color: string;
  size: number;
  left: number;
  top: number;
  squash: Animated.Value;
}) {
  const r = size / 2;
  const highlight = size * 0.42;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        {
          left,
          top,
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: popped ? mixColor(color, '#000000', 0.2) : color,
          borderColor: popped ? mixColor(color, '#000000', 0.32) : mixColor(color, '#FFFFFF', 0.25),
          transform: [{ scale: squash }],
        },
        !popped && styles.bubbleRaised,
      ]}
    >
      {popped ? (
        <>
          {/* Pushed in: shadow falls on the top-left, light catches the bottom-right. */}
          <View style={[styles.dimple, { width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39, borderTopColor: mixColor(color, '#000000', 0.45), borderLeftColor: mixColor(color, '#000000', 0.45), borderBottomColor: mixColor(color, '#FFFFFF', 0.25), borderRightColor: mixColor(color, '#FFFFFF', 0.25) }]} />
        </>
      ) : (
        <>
          <View style={[styles.dome, { width: size * 0.82, height: size * 0.82, borderRadius: size * 0.41, backgroundColor: mixColor(color, '#FFFFFF', 0.12) }]} />
          <View style={[styles.shine, { width: highlight, height: highlight * 0.6, borderRadius: highlight, top: size * 0.16, left: size * 0.2 }]} />
        </>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    borderRadius: 28,
    backgroundColor: '#1B1B26',
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  bubble: {
    position: 'absolute',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleRaised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  dome: {
    position: 'absolute',
  },
  shine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dimple: {
    borderWidth: 2.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  flipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
  },
  flipText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
});
