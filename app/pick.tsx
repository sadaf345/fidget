import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Pressable, StatusBar, useWindowDimensions, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { playHaptic, playSequence } from '@/lib/haptics';
import { Rumble } from '@/lib/rumble';
import { coreHaptics } from '@/lib/coreHaptics';
import { sound, useLoop } from '@/lib/sound/engine';
import { Bounds, bumpAt, createRng, Flake, flakeAt, makeBumps, makeFlake, outlinePoints, peelProgress, Point, snagsCrossed } from '@/lib/pick';
import { mixColor } from '@/lib/color';
import { usePref, useStat } from '@/hooks/useStat';
import ToyChrome from '@/components/ToyChrome';

const TONES = ['#F3D5C0', '#E5B898', '#C99674', '#A2704F', '#7A4E35', '#4F3324', '#B9B4C9'];
const START_FLAKES = 12;
const MAX_FLAKES = 16;
const REGROW_MS = 2600;
// Resting on a flake this long while feeling around catches its edge.
const DWELL_CATCH_MS = 150;
const SCAN_TICK_GAP_MS = 25;

function toneColors(tone: string) {
  return {
    flake: mixColor(tone, '#FFFFFF', 0.3),
    flakeHighlight: mixColor(tone, '#FFFFFF', 0.55),
    edge: mixColor(tone, '#000000', 0.2),
    shadow: mixColor(tone, '#000000', 0.5),
    pore: mixColor(tone, '#000000', 0.22),
    bump: mixColor(tone, '#000000', 0.07),
    bumpHighlight: mixColor(tone, '#FFFFFF', 0.28),
    blotch: mixColor(tone, '#B85C4A', 0.35),
    mark: mixColor(tone, '#E0705F', 0.35),
  };
}
type ToneColors = ReturnType<typeof toneColors>;

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
}

interface Peel {
  flake: Flake;
  start: Point;
  progress: number;
}

interface Mark {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface Flying {
  id: number;
  flake: Flake;
  x: number;
  y: number;
  dir: Point;
}

export default function PickScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [tone, setTone] = usePref('pick.tone', TONES[1]);
  const colors = useMemo(() => toneColors(tone), [tone]);
  const { value: pickedCount, add: addPicked } = useStat('pick.picked');

  const bounds = useMemo<Bounds>(
    () => ({ width, height, top: insets.top + 56, bottom: insets.bottom + 110 }),
    [width, height, insets.top, insets.bottom],
  );
  const rng = useRef(createRng(Date.now() % 1_000_000)).current;
  const nextId = useRef(1);
  const bumps = useMemo(() => makeBumps(createRng(11), width, height, 46), [width, height]);

  const flakesRef = useRef<Flake[]>([]);
  const [flakes, setFlakesState] = useState<Flake[]>(() => {
    const initial: Flake[] = [];
    for (let i = 0; i < START_FLAKES; i++) initial.push(makeFlake(rng, nextId.current++, bounds, initial));
    flakesRef.current = initial;
    return initial;
  });
  const setFlakes = useCallback((update: (prev: Flake[]) => Flake[]) => {
    flakesRef.current = update(flakesRef.current);
    setFlakesState(flakesRef.current);
  }, []);

  const [activeId, setActiveId] = useState<number | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [flying, setFlying] = useState<Flying[]>([]);
  const [hintVisible, setHintVisible] = useState(true);

  const lift = useRef(new Animated.Value(0)).current;
  const offsetX = useRef(new Animated.Value(0)).current;
  const offsetY = useRef(new Animated.Value(0)).current;
  const rumble = useRef(new Rumble()).current;
  // The skin's strain as a flake is worked loose.
  const strain = useLoop('creak');

  const touch = useRef({
    peel: null as Peel | null,
    scanKey: null as string | null,
    lastScanTick: 0,
    dwellTimer: null as ReturnType<typeof setTimeout> | null,
    dwellId: null as number | null,
    pos: { x: 0, y: 0 } as Point,
  }).current;

  useEffect(() => () => {
    rumble.stop();
    if (touch.dwellTimer) clearTimeout(touch.dwellTimer);
  }, [rumble, touch]);

  // New flakes keep surfacing, so there's always something to find.
  useEffect(() => {
    const timer = setInterval(() => {
      if (flakesRef.current.length >= MAX_FLAKES) return;
      setFlakes(prev => [...prev, makeFlake(rng, nextId.current++, bounds, prev)]);
    }, REGROW_MS);
    return () => clearInterval(timer);
  }, [bounds, rng, setFlakes]);

  const panResponder = useMemo(() => {
    const clearDwell = () => {
      if (touch.dwellTimer) clearTimeout(touch.dwellTimer);
      touch.dwellTimer = null;
      touch.dwellId = null;
    };

    const startPeel = (flake: Flake, at: Point) => {
      clearDwell();
      touch.peel = { flake, start: at, progress: flake.loosened };
      lift.setValue(flake.loosened);
      offsetX.setValue(0);
      offsetY.setValue(0);
      setActiveId(flake.id);
      setHintVisible(false);
      playHaptic('rigid');
      sound.play('catch', { volume: 0.8 });
    };

    const detach = (peel: Peel, at: Point) => {
      const { flake, start } = peel;
      // Our own build gets a short continuous rip as it tears; Expo Go just stops the tension.
      if (coreHaptics.available) rumble.fade(0.95, 280);
      else rumble.stop();
      playSequence([
        { at: 0, power: 'rigid' },
        { at: 16, power: 'heavy' },
        { at: 120, power: 'soft' },
      ]);
      strain.stop(30);
      sound.play('tear', { rate: 1.25 - flake.size / 60 });
      sound.play('reward', { volume: 0.55, delay: 90, vary: 0.08 });
      const dx = at.x - start.x;
      const dy = at.y - start.y;
      const len = Math.hypot(dx, dy) || 1;
      // Where the flake had stretched to when it tore free (the peel's follow factor at full progress).
      const reach = 0.35;
      const id = nextId.current++;
      setFlying(prev => [...prev, { id, flake, x: flake.x + dx * reach, y: flake.y + dy * reach, dir: { x: dx / len, y: dy / len } }]);
      setMarks(prev => [...prev, { id, x: flake.x, y: flake.y, size: flake.size }]);
      setFlakes(prev => prev.filter(f => f.id !== flake.id));
      setActiveId(null);
      touch.peel = null;
      touch.scanKey = `f${flake.id}`;
      addPicked();
    };

    const updatePeel = (peel: Peel, at: Point) => {
      const progress = peelProgress(peel.flake, peel.start, at);
      if (snagsCrossed(peel.flake, peel.progress, progress) > 0) {
        // It catches, then gives a little.
        playSequence([
          { at: 0, power: 'rigid' },
          { at: 30, power: 'light' },
        ]);
        sound.play('snag', { volume: 0.9, vary: 0.1 });
      }
      peel.progress = progress;
      if (progress >= 1) {
        detach(peel, at);
        return;
      }
      rumble.set(0.1 + 0.85 * Math.pow(progress, 1.3));
      strain.set({ volume: 0.08 + 0.4 * progress, rate: 0.75 + 0.6 * progress });
      lift.setValue(progress);
      // The flake stretches toward the finger as it loosens.
      const follow = 0.1 + 0.25 * progress;
      offsetX.setValue((at.x - peel.start.x) * follow);
      offsetY.setValue((at.y - peel.start.y) * follow);
    };

    const releasePeel = (peel: Peel) => {
      rumble.stop();
      strain.stop();
      playHaptic('soft');
      sound.play('tick', { volume: 0.5, rate: 0.8 });
      const kept = Math.min(0.85, Math.max(peel.flake.loosened, peel.progress * 0.55));
      setFlakes(prev => prev.map(f => (f.id === peel.flake.id ? { ...f, loosened: kept } : f)));
      Animated.parallel([
        Animated.spring(lift, { toValue: kept, useNativeDriver: true, friction: 6 }),
        Animated.spring(offsetX, { toValue: 0, useNativeDriver: true, friction: 6 }),
        Animated.spring(offsetY, { toValue: 0, useNativeDriver: true, friction: 6 }),
      ]).start(() => setActiveId(current => (current === peel.flake.id ? null : current)));
      touch.peel = null;
    };

    const scan = (at: Point) => {
      const flake = flakeAt(flakesRef.current, at.x, at.y, 4);
      const bump = flake ? -1 : bumpAt(bumps, at.x, at.y);
      const key = flake ? `f${flake.id}` : bump >= 0 ? `b${bump}` : null;
      const now = Date.now();
      if (key !== touch.scanKey) {
        touch.scanKey = key;
        if (key && now - touch.lastScanTick >= SCAN_TICK_GAP_MS) {
          touch.lastScanTick = now;
          if (coreHaptics.available) {
            // Graded texture: fine grain over bumps, a firmer edge over flakes, firmer still if lifted.
            if (flake) coreHaptics.tap(flake.loosened > 0 ? 0.8 : 0.55, 0.75);
            else coreHaptics.tap(0.3, 0.95);
          } else {
            playHaptic(flake ? (flake.loosened > 0 ? 'medium' : 'light') : 'selection');
          }
          // A dry scritch over flakes, a faint grain over bumps.
          sound.play('tick', flake ? { volume: flake.loosened > 0 ? 0.6 : 0.45, rate: 1.2, vary: 0.12 } : { volume: 0.2, rate: 1.6, vary: 0.15 });
        }
      }

      const catchable = flakeAt(flakesRef.current, at.x, at.y, 8);
      if (!catchable) {
        clearDwell();
      } else if (touch.dwellId !== catchable.id) {
        clearDwell();
        touch.dwellId = catchable.id;
        touch.dwellTimer = setTimeout(() => {
          const still = flakeAt(flakesRef.current, touch.pos.x, touch.pos.y, 8);
          if (still && still.id === catchable.id && !touch.peel) startPeel(still, touch.pos);
        }, DWELL_CATCH_MS);
      }
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const at = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
        touch.pos = at;
        touch.scanKey = null;
        const flake = flakeAt(flakesRef.current, at.x, at.y);
        if (flake) startPeel(flake, at);
        else scan(at);
      },
      onPanResponderMove: (evt) => {
        const at = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
        touch.pos = at;
        if (touch.peel) updatePeel(touch.peel, at);
        else scan(at);
      },
      onPanResponderRelease: () => {
        clearDwell();
        if (touch.peel) releasePeel(touch.peel);
      },
      onPanResponderTerminate: () => {
        clearDwell();
        if (touch.peel) releasePeel(touch.peel);
      },
    });
  }, [bumps, lift, offsetX, offsetY, rumble, strain, touch, addPicked, setFlakes]);

  const removeFlying = useCallback((id: number) => setFlying(prev => prev.filter(f => f.id !== id)), []);
  const removeMark = useCallback((id: number) => setMarks(prev => prev.filter(m => m.id !== id)), []);

  return (
    <View style={[styles.root, { backgroundColor: tone }]}>
      <StatusBar barStyle={isLight(tone) ? 'dark-content' : 'light-content'} />
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <SkinSurface width={width} height={height} tone={tone} colors={colors} bumps={bumps} />
        {marks.map(m => <FreshMark key={m.id} mark={m} color={colors.mark} onDone={removeMark} />)}
        {flakes.map(f => (
          <FlakeView
            key={f.id}
            flake={f}
            colors={colors}
            active={f.id === activeId}
            lift={lift}
            offsetX={offsetX}
            offsetY={offsetY}
          />
        ))}
        {flying.map(f => <FlyingFlake key={f.id} item={f} colors={colors} onDone={removeFlying} />)}
      </View>


      {hintVisible && (
        <View pointerEvents="none" style={[styles.hint, { bottom: insets.bottom + 88 }]}>
          <Text style={styles.hintText}>Feel around for a rough spot.{'\n'}Rest on it to catch the edge, then pull.</Text>
        </View>
      )}

      <View style={[styles.swatches, { bottom: insets.bottom + 20 }]}>
        {TONES.map(t => (
          <Pressable
            key={t}
            hitSlop={6}
            onPress={() => {
              playHaptic('selection');
              setTone(t);
            }}
            style={[styles.swatch, { backgroundColor: t }, t === tone && styles.swatchSelected]}
          />
        ))}
      </View>
      <ToyChrome toyId="pick" stat={`${pickedCount} picked`} tone={isLight(tone) ? 'dark' : 'light'} />
    </View>
  );
}

/** Skin-like backdrop: uneven tone, pores, and raised bumps you can feel. Drawn once per tone. */
const SkinSurface = React.memo(function SkinSurface({ width, height, tone, colors, bumps }: {
  width: number;
  height: number;
  tone: string;
  colors: ToneColors;
  bumps: { x: number; y: number; r: number }[];
}) {
  const pores = useMemo(() => {
    const rng = createRng(3);
    return Array.from({ length: 320 }, () => ({
      x: rng() * width,
      y: rng() * height,
      r: 0.35 + rng() * 0.8,
      o: 0.25 + rng() * 0.45,
    }));
  }, [width, height]);
  const blotches = useMemo(() => {
    const rng = createRng(5);
    return Array.from({ length: 5 }, (_, i) => ({ id: i, x: rng() * width, y: rng() * height, r: 90 + rng() * 140 }));
  }, [width, height]);

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="blotch" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.blotch} stopOpacity={0.22} />
          <Stop offset="1" stopColor={colors.blotch} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="vignette" cx="50%" cy="45%" r="75%">
          <Stop offset="0.6" stopColor="#000000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill={tone} />
      {blotches.map(b => <Circle key={b.id} cx={b.x} cy={b.y} r={b.r} fill="url(#blotch)" />)}
      {pores.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={colors.pore} opacity={p.o} />)}
      {bumps.map((b, i) => (
        <React.Fragment key={`b${i}`}>
          <Circle cx={b.x + 0.6} cy={b.y + 0.8} r={b.r} fill={colors.pore} opacity={0.35} />
          <Circle cx={b.x} cy={b.y} r={b.r} fill={colors.bump} />
          <Circle cx={b.x - b.r * 0.35} cy={b.y - b.r * 0.35} r={b.r * 0.4} fill={colors.bumpHighlight} opacity={0.8} />
        </React.Fragment>
      ))}
      <Rect width={width} height={height} fill="url(#vignette)" />
    </Svg>
  );
});

function flakeBox(flake: Flake) {
  const half = flake.size + 6;
  return { half, box: half * 2 };
}

function FlakeShape({ flake, half, fill, stroke, highlight }: { flake: Flake; half: number; fill: string; stroke?: string; highlight?: string }) {
  const points = outlinePoints(flake.outline.map(p => ({ x: p.x + half, y: p.y + half })));
  const inner = highlight
    ? outlinePoints(flake.outline.map(p => ({ x: p.x * 0.5 + half - 1.5, y: p.y * 0.5 + half - 1.5 })))
    : null;
  return (
    <Svg width={half * 2} height={half * 2}>
      <Polygon points={points} fill={fill} stroke={stroke} strokeWidth={stroke ? 0.9 : 0} strokeLinejoin="round" />
      {inner && <Polygon points={inner} fill={highlight} opacity={0.55} />}
    </Svg>
  );
}

const FlakeView = React.memo(function FlakeView({ flake, colors, active, lift, offsetX, offsetY }: {
  flake: Flake;
  colors: ToneColors;
  active: boolean;
  lift: Animated.Value;
  offsetX: Animated.Value;
  offsetY: Animated.Value;
}) {
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 900, useNativeDriver: true }).start();
  }, [appear]);

  const { half, box } = flakeBox(flake);
  const tilt = (flake.id % 2 === 0 ? 1 : -1) * 28;
  const loose = flake.loosened;

  const flakeTransform = active
    ? [
        { translateX: offsetX },
        { translateY: offsetY },
        { rotate: lift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${tilt}deg`] }) },
        { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) },
      ]
    : [{ rotate: `${tilt * loose}deg` }, { scale: 1 + 0.4 * loose }];
  const shadowOpacity = active
    ? lift.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.75] })
    : 0.3 + 0.45 * loose;

  return (
    <Animated.View pointerEvents="none" style={[styles.flake, { left: flake.x - half, top: flake.y - half, width: box, height: box, opacity: appear }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: shadowOpacity, transform: [{ translateX: 1.5 }, { translateY: 2 }] }]}>
        <FlakeShape flake={flake} half={half} fill={colors.shadow} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: flakeTransform }]}>
        <FlakeShape flake={flake} half={half} fill={colors.flake} stroke={colors.edge} highlight={colors.flakeHighlight} />
      </Animated.View>
    </Animated.View>
  );
});

function FlyingFlake({ item, colors, onDone }: { item: Flying; colors: ToneColors; onDone: (id: number) => void }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => onDone(item.id));
  }, [t, item.id, onDone]);

  const { half, box } = flakeBox(item.flake);
  const { dir } = item;
  const spin = (item.flake.id % 2 === 0 ? 1 : -1) * 240;
  return (
    <View pointerEvents="none" style={[styles.flake, { left: item.x - half, top: item.y - half, width: box, height: box }]}>
      <Animated.View
        style={{
          opacity: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.85, 0] }),
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, dir.x * 150] }) },
            { translateY: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, dir.y * 90 - 10, dir.y * 150 + 70] }) },
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spin}deg`] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1.4, 0.9] }) },
          ],
        }}
      >
        <FlakeShape flake={item.flake} half={half} fill={colors.flake} stroke={colors.edge} highlight={colors.flakeHighlight} />
      </Animated.View>
      <Animated.Text
        style={[
          styles.plusOne,
          {
            opacity: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
            transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -46] }) }],
          },
        ]}
      >
        +1
      </Animated.Text>
    </View>
  );
}

/** The fresh spot a flake leaves behind; it heals over a few seconds. */
function FreshMark({ mark, color, onDone }: { mark: Mark; color: string; onDone: (id: number) => void }) {
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 0, duration: 7000, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => onDone(mark.id));
  }, [opacity, mark.id, onDone]);
  const d = mark.size * 1.7;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.mark, { left: mark.x - d / 2, top: mark.y - d / 2, width: d, height: d, borderRadius: d / 2, backgroundColor: color, opacity }]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flake: {
    position: 'absolute',
  },
  mark: {
    position: 'absolute',
  },
  plusOne: {
    position: 'absolute',
    alignSelf: 'center',
    top: -8,
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 4,
  },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(20,16,14,0.62)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  swatches: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(20,16,14,0.45)',
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  swatchSelected: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
});
