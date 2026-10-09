import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, StatusBar, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { continuous, playHaptic } from '@/lib/haptics';
import { createRng, Point } from '@/lib/pick';
import { clearedFraction, Coverage, createCoverage, PHRASES, scratchAt } from '@/lib/scratch';
import ToyChrome from '@/components/ToyChrome';
import { sound, useLoop } from '@/lib/sound/engine';

const BRUSH = 22;
const DONE_AT = 0.9;
const IDLE_MS = 70;
const NEXT_CARD_MS = 3000;
const CARD_COLORS: [string, string][] = [
  ['#A5B4FC', '#F0ABFC'],
  ['#99F6E4', '#93C5FD'],
  ['#FDE68A', '#FCA5A5'],
  ['#BBF7D0', '#A5F3FC'],
  ['#FBCFE8', '#C7D2FE'],
];

export default function ScratchScreen() {
  const insets = useSafeAreaInsets();
  const [card, setCard] = useState({ width: 0, height: 0 });
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const foil = useRef(new Animated.Value(1)).current;
  // The scratch of a coin edge on foil.
  const rasp = useLoop('noise', { type: 'bandpass', freq: 4200, q: 0.7 });
  const s = useRef({
    coverage: null as Coverage | null,
    strokes: [] as Point[][],
    last: { x: 0, y: 0 } as Point,
    lastTime: 0,
    idle: null as ReturnType<typeof setTimeout> | null,
    next: null as ReturnType<typeof setTimeout> | null,
    done: false,
  }).current;

  useEffect(() => {
    if (card.width > 0) s.coverage = createCoverage(card.width, card.height);
  }, [card, s]);
  useEffect(() => () => {
    if (s.idle) clearTimeout(s.idle);
    if (s.next) clearTimeout(s.next);
  }, [s]);

  const sparkles = useMemo(() => {
    const rng = createRng(17);
    return Array.from({ length: 90 }, () => ({ x: rng() * card.width, y: rng() * card.height, r: 0.6 + rng() * 1.6, o: 0.25 + rng() * 0.5 }));
  }, [card]);

  const panResponder = useMemo(() => {
    const complete = () => {
      s.done = true;
      setDone(true);
      continuous.stop();
      rasp.stop(40);
      playHaptic('success');
      sound.play('chime');
      Animated.timing(foil, { toValue: 0, duration: 500, useNativeDriver: true }).start();
      s.next = setTimeout(() => {
        s.strokes = [];
        setStrokes([]);
        if (s.coverage) s.coverage = createCoverage(card.width, card.height);
        s.done = false;
        setDone(false);
        setIndex(i => i + 1);
        foil.setValue(1);
      }, NEXT_CARD_MS);
    };

    const rub = (at: Point, speed: number) => {
      if (!s.coverage || s.done) return;
      // Fill the gap between move events so fast rubs don't skip foil.
      const steps = Math.max(1, Math.ceil(Math.hypot(at.x - s.last.x, at.y - s.last.y) / (BRUSH / 2)));
      let fresh = 0;
      for (let i = 1; i <= steps; i++) {
        fresh += scratchAt(s.coverage, s.last.x + ((at.x - s.last.x) * i) / steps, s.last.y + ((at.y - s.last.y) * i) / steps, BRUSH);
      }
      if (fresh > 0) {
        continuous.set(Math.min(0.5, 0.25 * (0.5 + speed / 0.4)), 1.0);
        rasp.set({ volume: Math.min(0.5, 0.12 + speed * 0.35 + fresh * 0.01), freq: 3500 + Math.min(1, speed) * 2500 });
        if (s.idle) clearTimeout(s.idle);
        s.idle = setTimeout(() => {
          continuous.stop();
          rasp.stop(50);
        }, IDLE_MS);
      } else {
        continuous.stop();
        rasp.stop(50);
      }
      if (clearedFraction(s.coverage) >= DONE_AT) complete();
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => !s.done,
      onMoveShouldSetPanResponder: () => !s.done,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: evt => {
        const at = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
        s.last = at;
        s.lastTime = Date.now();
        s.strokes = [...s.strokes, [at]];
        setStrokes(s.strokes);
        rub(at, 0);
      },
      onPanResponderMove: evt => {
        const at = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
        const now = Date.now();
        const step = Math.hypot(at.x - s.last.x, at.y - s.last.y);
        if (step < 3) return;
        const speed = step / Math.max(1, now - s.lastTime);
        rub(at, speed);
        s.last = at;
        s.lastTime = now;
        const current = s.strokes[s.strokes.length - 1];
        current.push(at);
        setStrokes([...s.strokes]);
      },
      onPanResponderRelease: () => {
        continuous.stop();
        rasp.stop();
      },
      onPanResponderTerminate: () => {
        continuous.stop();
        rasp.stop();
      },
    });
  }, [s, foil, card, rasp]);

  const path = strokes
    .map(stroke => stroke.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + (stroke.length === 1 ? ' l 0.1 0' : ''))
    .join(' ');
  const [c1, c2] = CARD_COLORS[index % CARD_COLORS.length];
  const phrase = PHRASES[index % PHRASES.length];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 40 }]}>
        <View
          style={styles.card}
          onLayout={(e: LayoutChangeEvent) => setCard({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          {...panResponder.panHandlers}
          accessible
          accessibilityLabel={done ? phrase : 'Scratch card. Rub to reveal a message.'}
        >
          {card.width > 0 && (
            <>
              <Svg width={card.width} height={card.height} style={StyleSheet.absoluteFill} pointerEvents="none">
                <Defs>
                  <LinearGradient id="under" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={c1} />
                    <Stop offset="1" stopColor={c2} />
                  </LinearGradient>
                </Defs>
                <Rect width={card.width} height={card.height} fill="url(#under)" />
                {[0.18, 0.32, 0.46, 0.6].map(r => (
                  <Circle key={r} cx={card.width / 2} cy={card.height / 2} r={card.width * r} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={2} />
                ))}
              </Svg>
              <View pointerEvents="none" style={styles.phraseWrap}>
                <Text style={styles.phrase} maxFontSizeMultiplier={1.5}>{phrase}</Text>
              </View>
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: foil }]}>
                <Svg width={card.width} height={card.height}>
                  <Defs>
                    <LinearGradient id="foil" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0" stopColor="#E5E7EB" />
                      <Stop offset="0.5" stopColor="#9CA3AF" />
                      <Stop offset="1" stopColor="#D1D5DB" />
                    </LinearGradient>
                    <Mask id="scratched" maskUnits="userSpaceOnUse" x={0} y={0} width={card.width} height={card.height}>
                      <Rect width={card.width} height={card.height} fill="#FFFFFF" />
                      <Path d={path} stroke="#000000" strokeWidth={BRUSH * 2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </Mask>
                  </Defs>
                  <G mask="url(#scratched)">
                    <Rect width={card.width} height={card.height} fill="url(#foil)" />
                    {sparkles.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#FFFFFF" opacity={p.o} />)}
                  </G>
                </Svg>
              </Animated.View>
            </>
          )}
        </View>
        <Text style={styles.hint}>{done ? 'A new card is on its way.' : 'Rub away the foil.'}</Text>
      </View>
      <ToyChrome toyId="scratch" />
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
    paddingHorizontal: 28,
    gap: 18,
  },
  card: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
  },
  phraseWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  phrase: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E1B4B',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  hint: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
