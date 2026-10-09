import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, StatusBar, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon, Rect } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { continuous, transient } from '@/lib/haptics';
import { teethPerSecond, TOOTH_PITCH, toothIntensity, toothSpread } from '@/lib/zipper';
import ToyChrome from '@/components/ToyChrome';
import { sound, useLoop } from '@/lib/sound/engine';

const TAPE_W = 40;
const TOOTH_W = 13;
const TOOTH_H = 7;
const MAX_SPREAD = 70;
const PULL_W = 46;
const PULL_H = 86;
// Above this rate, single tooth taps can't keep up, so a continuous buzz carries the "zzzip".
const BUZZ_TEETH_PER_SECOND = 45;

export default function ZipperScreen() {
  const insets = useSafeAreaInsets();
  const [track, setTrack] = useState({ width: 0, height: 0 });
  const [pull, setPull] = useState(0);
  const s = useRef({ pull: 0, start: 0, lastTooth: 0, lastMove: 0, atEnd: true as boolean, buzzing: false }).current;
  // The "zzzip": a buzz whose pitch is the rate the teeth go by (the loop's own tone is 110 Hz).
  const zip = useLoop('buzz', { type: 'bandpass', freq: 2400, q: 0.8 });
  const length = Math.max(0, track.height - PULL_H);

  const panResponder = useMemo(() => PanResponder.create({
    // Only the pull itself can be grabbed.
    onStartShouldSetPanResponder: evt => Math.abs(evt.nativeEvent.locationY - (s.pull + PULL_H / 2)) < PULL_H * 0.8,
    onMoveShouldSetPanResponder: () => false,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      s.start = s.pull;
      s.lastMove = Date.now();
    },
    onPanResponderMove: (_, gs) => {
      const next = Math.max(0, Math.min(length, s.start + gs.dy));
      const now = Date.now();
      const speed = (next - s.pull) / Math.max(1, now - s.lastMove);
      s.lastMove = now;
      s.pull = next;
      setPull(next);

      const tooth = Math.floor(next / TOOTH_PITCH);
      if (tooth !== s.lastTooth) {
        s.lastTooth = tooth;
        transient(toothIntensity(speed), 0.7);
        sound.play('zipTick', { volume: 0.5 + 0.4 * Math.min(1, Math.abs(speed) / 1.2), vary: 0.08 });
      }
      const rate = teethPerSecond(speed);
      if (rate > 25) zip.set({ volume: Math.min(0.55, 0.12 + rate / 400), rate: Math.min(3, rate / 110), freq: 1800 + rate * 8 });
      else zip.stop(60);
      if (teethPerSecond(speed) > BUZZ_TEETH_PER_SECOND) {
        s.buzzing = true;
        continuous.set(0.35 + 0.35 * Math.min(1, Math.abs(speed) / 2), 0.7);
      } else if (s.buzzing) {
        s.buzzing = false;
        continuous.stop();
      }
      const atEnd = next <= 0 || next >= length;
      if (atEnd && !s.atEnd) {
        transient(1.0, 0.3);
        sound.play('zipEnd');
      }
      s.atEnd = atEnd;
    },
    onPanResponderRelease: () => {
      s.buzzing = false;
      continuous.stop();
      zip.stop();
    },
    onPanResponderTerminate: () => {
      s.buzzing = false;
      continuous.stop();
      zip.stop();
    },
  }), [s, length, zip]);

  const cx = track.width / 2;
  const pullCenter = pull + PULL_H / 2;
  const teeth = Math.floor(track.height / TOOTH_PITCH);
  const sides = useMemo(() => {
    const left: string[] = [];
    const right: string[] = [];
    for (let y = 0; y <= track.height; y += TOOTH_PITCH) {
      const spread = toothSpread(y, pullCenter, MAX_SPREAD);
      left.push(`${(cx - spread - TOOTH_W + 2).toFixed(1)},${y}`);
      right.push(`${(cx + spread + TOOTH_W - 2).toFixed(1)},${y}`);
    }
    const leftOuter = left.map(p => {
      const [x, y] = p.split(',').map(Number);
      return `${x - TAPE_W},${y}`;
    }).reverse();
    const rightOuter = right.map(p => {
      const [x, y] = p.split(',').map(Number);
      return `${x + TAPE_W},${y}`;
    }).reverse();
    return { left: [...left, ...leftOuter].join(' '), right: [...right, ...rightOuter].join(' ') };
  }, [cx, track.height, pullCenter]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 40 }]}>
        <View
          style={styles.track}
          onLayout={(e: LayoutChangeEvent) => setTrack({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          {...panResponder.panHandlers}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Zipper"
          accessibilityValue={{ min: 0, max: 100, now: length ? Math.round((pull / length) * 100) : 0 }}
        >
          {track.width > 0 && (
            <Svg width={track.width} height={track.height} pointerEvents="none">
              <Polygon points={sides.left} fill="#1E3A5F" />
              <Polygon points={sides.right} fill="#1E3A5F" />
              {Array.from({ length: teeth }, (_, k) => {
                const y = k * TOOTH_PITCH;
                const spread = toothSpread(y + TOOTH_H / 2, pullCenter, MAX_SPREAD);
                const leftSide = k % 2 === 0;
                const x = leftSide ? cx - spread - TOOTH_W + 3 : cx + spread - 3;
                return <Rect key={k} x={x} y={y} width={TOOTH_W} height={TOOTH_H} rx={2} fill={leftSide ? '#CBD5E1' : '#E2E8F0'} />;
              })}
            </Svg>
          )}
          <View pointerEvents="none" style={[styles.pull, { left: cx - PULL_W / 2, top: pull }]}>
            <View style={styles.slider} />
            <View style={styles.tab}>
              <View style={styles.tabHole} />
            </View>
          </View>
        </View>
        <Text style={styles.hint}>Drag the pull down to open, up to close.</Text>
      </View>
      <ToyChrome toyId="zipper" />
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
    paddingHorizontal: 40,
  },
  track: {
    flex: 1,
  },
  pull: {
    position: 'absolute',
    width: PULL_W,
    height: PULL_H,
    alignItems: 'center',
  },
  slider: {
    width: 40,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#94A3B8',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  tab: {
    width: 26,
    height: 54,
    marginTop: -4,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  tabHole: {
    width: 10,
    height: 16,
    borderRadius: 5,
    backgroundColor: theme.bg,
  },
  hint: {
    marginTop: 18,
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
