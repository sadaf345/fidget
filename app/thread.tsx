import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, StatusBar, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { continuous, playHaptic, transient } from '@/lib/haptics';
import { createRng, Point } from '@/lib/pick';
import { mixColor } from '@/lib/color';
import { makeResists, pullThread, ThreadState } from '@/lib/thread';
import ToyChrome from '@/components/ToyChrome';
import { sound, useLoop } from '@/lib/sound/engine';

const COLS = 8;
const ROWS = 10;
const COUNT = COLS * ROWS;
const STITCH_H = 24;
const DANGLE = 46;
const GRAB_RADIUS = 60;
const PATCH_COLORS = ['#E76F51', '#2A9D8F', '#E9C46A', '#8AB17D', '#B5838D', '#6D8EAD'];

/** Stitches unravel from the bottom row up, snaking back and forth. Returns the stitch's column and row. */
function stitchAt(index: number): { col: number; row: number } {
  const fromBottom = Math.floor(index / COLS);
  const along = index % COLS;
  const row = ROWS - 1 - fromBottom;
  const col = fromBottom % 2 === 0 ? COLS - 1 - along : along;
  return { col, row };
}

/** A crimped yarn path from a to b (knitted yarn stays kinky). */
function yarnPath(a: Point, b: Point): string {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(2, Math.floor(len / 9));
  const nx = -(b.y - a.y) / (len || 1);
  const ny = (b.x - a.x) / (len || 1);
  let d = `M ${a.x.toFixed(1)} ${a.y.toFixed(1)}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const wobble = i === steps ? 0 : Math.sin(i * 1.7) * 3.5;
    d += ` L ${(a.x + (b.x - a.x) * t + nx * wobble).toFixed(1)} ${(a.y + (b.y - a.y) * t + ny * wobble).toFixed(1)}`;
  }
  return d;
}

export default function ThreadScreen() {
  const insets = useSafeAreaInsets();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [knit, setKnit] = useState({ done: 0, patch: 0 });
  const [end, setEnd] = useState<Point | null>(null);
  const appear = useRef(new Animated.Value(1)).current;
  const strain = useLoop('creak');
  const s = useRef({
    state: { done: 0, pull: 0 } as ThreadState,
    resists: makeResists(COUNT, createRng(1)),
    patch: 0,
    end: { x: 0, y: 0 } as Point,
    dragging: false,
    lastDist: 0,
  }).current;

  const patchW = Math.min(area.width - 40, 320);
  const cellW = patchW / COLS;
  const patchH = ROWS * STITCH_H;
  const patchX = (area.width - patchW) / 2;
  const patchY = Math.max(10, (area.height - patchH) / 2 - 60);

  const anchorFor = (done: number): Point => {
    if (done >= COUNT) return { x: patchX + patchW / 2, y: patchY + patchH };
    const { col, row } = stitchAt(done);
    return { x: patchX + (col + 0.5) * cellW, y: patchY + (row + 1) * STITCH_H - 4 };
  };
  const anchor = anchorFor(knit.done);
  const restEnd = { x: anchor.x, y: anchor.y + DANGLE };
  const threadEnd = end ?? restEnd;

  const panResponder = useMemo(() => {
    const newPatch = () => {
      continuous.stop();
      strain.stop(30);
      playHaptic('success');
      sound.play('chime', { volume: 0.7 });
      s.patch += 1;
      s.state = { done: 0, pull: 0 };
      s.resists = makeResists(COUNT, createRng(s.patch + 1));
      setKnit({ done: 0, patch: s.patch });
      appear.setValue(0);
      Animated.timing(appear, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: evt => {
        const a = anchorFor(s.state.done);
        const tip = { x: a.x, y: a.y + DANGLE };
        return Math.hypot(evt.nativeEvent.locationX - tip.x, evt.nativeEvent.locationY - tip.y) < GRAB_RADIUS;
      },
      onMoveShouldSetPanResponder: () => false,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: evt => {
        s.dragging = true;
        const at = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
        const a = anchorFor(s.state.done);
        s.lastDist = Math.hypot(at.x - a.x, at.y - a.y);
        s.end = at;
        setEnd(at);
        transient(0.3, 0.5);
        sound.play('tick', { volume: 0.5, rate: 0.7 });
      },
      onPanResponderMove: evt => {
        const at = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
        s.end = at;
        setEnd(at);
        // Only pulling away from the knit draws yarn out of it.
        const a = anchorFor(s.state.done);
        const dist = Math.hypot(at.x - a.x, at.y - a.y);
        const gained = dist - s.lastDist;
        s.lastDist = dist;
        if (gained <= 0) return;
        const r = pullThread(s.state, gained, s.resists);
        const before = s.state.done;
        s.state = r.state;
        for (const e of r.events) {
          if (e === 'tug') {
            transient(0.6, 0.5);
            sound.play('tug', { vary: 0.1 });
          }
          if (e === 'give') {
            continuous.stop();
            strain.stop(20);
            transient(0.8, 0.6);
            sound.play('snap');
          }
        }
        if (r.tension > 0) {
          continuous.set(0.15 + 0.45 * r.tension, 0.5);
          strain.set({ volume: 0.1 + 0.4 * r.tension, rate: 0.8 + 0.5 * r.tension });
        }
        if (r.state.done !== before) {
          if (r.state.done >= COUNT) {
            newPatch();
            return;
          }
          setKnit(k => ({ ...k, done: r.state.done }));
          // The yarn now comes out of the next stitch; measure pull from there.
          const next = anchorFor(r.state.done);
          s.lastDist = Math.hypot(at.x - next.x, at.y - next.y);
        }
      },
      onPanResponderRelease: () => {
        s.dragging = false;
        continuous.stop();
        strain.stop();
        setEnd(null);
      },
      onPanResponderTerminate: () => {
        s.dragging = false;
        continuous.stop();
        strain.stop();
        setEnd(null);
      },
    });
    // anchorFor depends on layout, which panResponder must follow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, appear, patchX, patchY, cellW, patchW, strain]);

  const color = PATCH_COLORS[knit.patch % PATCH_COLORS.length];
  const dark = mixColor(color, '#000000', 0.25);
  const light = mixColor(color, '#FFFFFF', 0.18);

  const stitches = useMemo(() => {
    const hidden = new Set(Array.from({ length: knit.done }, (_, i) => {
      const { col, row } = stitchAt(i);
      return row * COLS + col;
    }));
    let d = '';
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (hidden.has(row * COLS + col)) continue;
        const x0 = patchX + col * cellW;
        const y0 = patchY + row * STITCH_H;
        const xc = x0 + cellW / 2;
        d += `M ${(x0 + cellW * 0.18).toFixed(1)} ${(y0 + 4).toFixed(1)} L ${xc.toFixed(1)} ${(y0 + STITCH_H - 3).toFixed(1)} `;
        d += `M ${(x0 + cellW * 0.82).toFixed(1)} ${(y0 + 4).toFixed(1)} L ${xc.toFixed(1)} ${(y0 + STITCH_H - 3).toFixed(1)} `;
      }
    }
    return d;
  }, [knit.done, patchX, patchY, cellW]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        <View
          style={styles.area}
          onLayout={(e: LayoutChangeEvent) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          {...panResponder.panHandlers}
          accessible
          accessibilityLabel="A knit patch with a loose thread. Drag the thread end down to unravel it."
        >
          {area.width > 0 && (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: appear }]}>
              <Svg width={area.width} height={area.height}>
                <Rect x={patchX - 8} y={patchY - 8} width={patchW + 16} height={patchH + 16} rx={14} fill={dark} opacity={0.35} />
                <Path d={stitches} stroke={dark} strokeWidth={cellW * 0.42} strokeLinecap="round" fill="none" />
                <Path d={stitches} stroke={color} strokeWidth={cellW * 0.3} strokeLinecap="round" fill="none" />
                <Path d={stitches} stroke={light} strokeWidth={cellW * 0.08} strokeLinecap="round" fill="none" opacity={0.6} />
                <Path d={yarnPath(anchor, threadEnd)} stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
            </Animated.View>
          )}
          {area.width > 0 && !end && <View pointerEvents="none" style={[styles.grab, { left: restEnd.x - 12, top: restEnd.y - 12 }]} />}
        </View>
        <Text style={styles.hint}>Pull the loose thread. Pull again.</Text>
      </View>
      <ToyChrome toyId="thread" />
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
  },
  area: {
    flex: 1,
  },
  grab: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  hint: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
