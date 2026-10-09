import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, PanResponder, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { continuous, transient } from '@/lib/haptics';
import { createRng } from '@/lib/pick';
import { useToyOption } from '@/contexts/SettingsContext';
import Segmented from '@/components/ui/Segmented';
import ToyChrome from '@/components/ToyChrome';
import { sound, useLoop } from '@/lib/sound/engine';

type Texture = 'corduroy' | 'sandpaper' | 'stone';

const RIB_PITCH = 8;
// The surface follows the finger this much, for a sense of drag.
const FOLLOW = 0.12;
const IDLE_MS = 60;
const STONE_FADE_MS = 150;

export default function TextureScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [texture, setTexture] = useToyOption<Texture>('texture', 'kind', 'corduroy');
  const offset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const rasp = useLoop('noise', { type: 'highpass', freq: 2800 });
  const hush = useLoop('brown', { type: 'lowpass', freq: 450 });
  const s = useRef({
    last: { x: 0, y: 0 },
    start: { x: 0, y: 0 },
    lastTime: 0,
    travel: 0,
    idle: null as ReturnType<typeof setTimeout> | null,
    fade: null as ReturnType<typeof setInterval> | null,
    texture,
  }).current;
  useEffect(() => {
    s.texture = texture;
    continuous.stop();
    rasp.stop();
    hush.stop();
  }, [texture, s, rasp, hush]);

  useEffect(() => () => {
    if (s.idle) clearTimeout(s.idle);
    if (s.fade) clearInterval(s.fade);
  }, [s]);

  const panResponder = useMemo(() => {
    const stopFade = () => {
      if (s.fade) clearInterval(s.fade);
      s.fade = null;
    };
    // The finger stopped: sandpaper goes quiet at once; stone fades over 150 ms.
    const onIdle = () => {
      if (s.texture === 'stone') {
        stopFade();
        const began = Date.now();
        s.fade = setInterval(() => {
          const t = (Date.now() - began) / STONE_FADE_MS;
          if (t >= 1) {
            stopFade();
            continuous.stop();
            hush.stop(30);
          } else {
            continuous.set(0.2 * (1 - t), 0.1);
            hush.set({ volume: 0.3 * (1 - t) });
          }
        }, 16);
      } else {
        continuous.stop();
        rasp.stop(40);
      }
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: evt => {
        const { pageX, pageY } = evt.nativeEvent;
        s.last = { x: pageX, y: pageY };
        s.start = { x: pageX, y: pageY };
        s.lastTime = Date.now();
        s.travel = 0;
      },
      onPanResponderMove: evt => {
        const { pageX, pageY } = evt.nativeEvent;
        const now = Date.now();
        const step = Math.hypot(pageX - s.last.x, pageY - s.last.y);
        const speed = step / Math.max(1, now - s.lastTime); // points per ms
        s.last = { x: pageX, y: pageY };
        s.lastTime = now;
        offset.setValue({ x: (pageX - s.start.x) * FOLLOW, y: (pageY - s.start.y) * FOLLOW });
        if (step === 0) return;

        stopFade();
        if (s.texture === 'corduroy') {
          s.travel += step;
          while (s.travel >= RIB_PITCH) {
            s.travel -= RIB_PITCH;
            transient(0.4, 0.5);
            sound.play('rib', { vary: 0.1 });
          }
        } else if (s.texture === 'sandpaper') {
          const jitter = 0.85 + Math.random() * 0.3;
          continuous.set(Math.min(0.4, speed * 0.35) * jitter, 0.9);
          rasp.set({ volume: Math.min(0.55, speed * 0.45) * jitter, freq: 2400 + speed * 1500 });
        } else {
          continuous.set(0.2, 0.1);
          hush.set({ volume: 0.3, freq: 350 + Math.min(1, speed) * 250 });
        }
        if (s.idle) clearTimeout(s.idle);
        s.idle = setTimeout(onIdle, IDLE_MS);
      },
      onPanResponderRelease: () => {
        if (s.idle) clearTimeout(s.idle);
        onIdle();
        Animated.spring(offset, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        stopFade();
        continuous.stop();
        rasp.stop();
        hush.stop();
        offset.setValue({ x: 0, y: 0 });
      },
    });
  }, [s, offset, rasp, hush]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} accessibilityLabel={`${texture} texture. Rub it.`}>
        <Animated.View pointerEvents="none" style={[styles.surface, { transform: offset.getTranslateTransform() }]}>
          <Surface kind={texture} width={width + 80} height={height + 80} />
        </Animated.View>
      </View>
      <View style={[styles.picker, { bottom: insets.bottom + 20 }]}>
        <Segmented
          label="Texture"
          value={texture}
          onChange={setTexture}
          options={[{ value: 'corduroy', label: 'Corduroy' }, { value: 'sandpaper', label: 'Sandpaper' }, { value: 'stone', label: 'Stone' }]}
        />
      </View>
      <ToyChrome toyId="texture" />
    </View>
  );
}

const Surface = React.memo(function Surface({ kind, width, height }: { kind: Texture; width: number; height: number }) {
  const grains = useMemo(() => {
    const rng = createRng(kind === 'sandpaper' ? 21 : 33);
    const count = kind === 'sandpaper' ? 1400 : 160;
    return Array.from({ length: count }, () => ({ x: rng() * width, y: rng() * height, r: 0.4 + rng() * 1.3, o: 0.25 + rng() * 0.6, light: rng() > 0.5 }));
  }, [kind, width, height]);

  if (kind === 'corduroy') {
    return (
      <Svg width={width} height={height}>
        <Rect width={width} height={height} fill="#6B4F3A" />
        {Array.from({ length: Math.ceil(width / RIB_PITCH) }, (_, i) => (
          <React.Fragment key={i}>
            <Rect x={i * RIB_PITCH} y={0} width={RIB_PITCH - 2.5} height={height} fill="#8B6A4F" />
            <Rect x={i * RIB_PITCH + 1} y={0} width={1.6} height={height} fill="#A9876A" opacity={0.7} />
          </React.Fragment>
        ))}
      </Svg>
    );
  }
  if (kind === 'sandpaper') {
    return (
      <Svg width={width} height={height}>
        <Rect width={width} height={height} fill="#B07A4A" />
        {grains.map((g, i) => <Circle key={i} cx={g.x} cy={g.y} r={g.r} fill={g.light ? '#E8C9A0' : '#5C3B22'} opacity={g.o} />)}
      </Svg>
    );
  }
  return (
    <Svg width={width} height={height}>
      <Defs>
        <RadialGradient id="stone" cx="45%" cy="40%" r="75%">
          <Stop offset="0" stopColor="#9CA3AF" />
          <Stop offset="0.6" stopColor="#6B7280" />
          <Stop offset="1" stopColor="#374151" />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#stone)" />
      {grains.map((g, i) => <Circle key={i} cx={g.x} cy={g.y} r={g.r * 1.4} fill={g.light ? '#D1D5DB' : '#1F2937'} opacity={g.o * 0.35} />)}
    </Svg>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  surface: {
    position: 'absolute',
    left: -40,
    top: -40,
  },
  picker: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
});
