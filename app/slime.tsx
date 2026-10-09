import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { continuous, playEvents } from '@/lib/haptics';
import { createSlime, pressureFor, slimePath, SlimeTouch, stepSlime, targetOffsets } from '@/lib/slime';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import ToyChrome from '@/components/ToyChrome';
import { sound, useLoop } from '@/lib/sound/engine';

interface Finger {
  x: number;
  y: number;
  since: number;
}

export default function SlimeScreen() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [path, setPath] = useState('');
  const [dimples, setDimples] = useState<SlimeTouch[]>([]);
  const slime = useRef(createSlime()).current;
  const fingers = useRef(new Map<string, Finger>()).current;
  // A wet squelch that darkens and swells as you press in, with the odd bubble.
  const squelch = useLoop('brown', { type: 'lowpass', freq: 300, q: 2 });
  const nextBubble = useRef(0);
  const areaRef = useRef<View>(null);
  // Window position of the slime area: touch positions come in window coordinates.
  const origin = useRef({ x: 0, y: 0 });
  const measure = useCallback(() => {
    areaRef.current?.measureInWindow((x, y, width, height) => {
      origin.current = { x, y };
      setStage(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
  }, []);

  const radius = Math.min(stage.width, stage.height) * 0.36;
  const cx = stage.width / 2;
  const cy = stage.height / 2;

  const touchesNow = useCallback((): SlimeTouch[] => {
    const now = Date.now();
    return [...fingers.values()].map(f => ({ x: f.x - cx, y: f.y - cy, pressure: pressureFor(now - f.since) }));
  }, [fingers, cx, cy]);

  // Runs the springs while the screen is open; renders only while something moves.
  useFocusEffect(useCallback(() => {
    if (radius <= 0) return;
    let frame: number | null = null;
    let last: number | null = null;
    let idle = false;
    const tick = (ts: number) => {
      const dt = last === null ? 1 / 60 : Math.min((ts - last) / 1000, 1 / 30);
      last = ts;
      const touches = touchesNow();
      const motion = stepSlime(slime, targetOffsets(radius, touches), dt);
      if (touches.length > 0) {
        const pressure = Math.max(...touches.map(t => t.pressure));
        continuous.set(0.2 + 0.6 * pressure, 0.15);
        squelch.set({ volume: 0.12 + 0.38 * pressure + 0.04 * (touches.length - 1), freq: 260 + 640 * pressure, rate: 0.8 + 0.3 * pressure });
        const now = Date.now();
        if (motion > 2 && now > nextBubble.current) {
          nextBubble.current = now + 180 + Math.random() * 520;
          sound.play('blip', { volume: 0.35 + 0.4 * pressure, rate: 0.7 + Math.random() * 0.8 });
        }
      }
      const still = touches.length === 0 && motion < 0.05;
      if (!still || !idle) {
        setPath(slimePath(cx, cy, radius, slime.offsets));
        setDimples(touches);
      }
      idle = still;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [radius, cx, cy, slime, touchesNow, squelch]));

  const sync = (e: GestureResponderEvent) => {
    const seen = new Set<string>();
    Array.from(e.nativeEvent.touches).forEach(t => {
      const id = String(t.identifier);
      seen.add(id);
      const prev = fingers.get(id);
      fingers.set(id, { x: t.pageX - origin.current.x, y: t.pageY - origin.current.y, since: prev?.since ?? Date.now() });
    });
    for (const id of [...fingers.keys()]) if (!seen.has(id)) fingers.delete(id);
  };

  const handleEnd = (e: GestureResponderEvent) => {
    const hadFingers = fingers.size > 0;
    sync(e);
    if (hadFingers && fingers.size === 0) {
      continuous.stop();
      squelch.stop(120);
      sound.play('wobble', { rate: 0.85 + Math.random() * 0.3 });
      // The wobble as it settles back.
      playEvents([
        { time: 0, intensity: 0.4, sharpness: 0.4 },
        { time: 60, intensity: 0.25, sharpness: 0.3 },
        { time: 120, intensity: 0.1, sharpness: 0.2 },
      ]);
      if (reduced) {
        slime.offsets.fill(0);
        slime.velocities.fill(0);
      }
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 56 }]}>
        <View
          ref={areaRef}
          style={styles.area}
          onLayout={measure}
          onTouchStart={sync}
          onTouchMove={sync}
          onTouchEnd={handleEnd}
          onTouchCancel={handleEnd}
          accessible
          accessibilityLabel="Slime. Press and hold, drag to stretch it."
        >
          {stage.width > 0 && path !== '' && (
            <Svg width={stage.width} height={stage.height} pointerEvents="none">
              <Defs>
                <RadialGradient id="slime" cx="40%" cy="35%" r="75%">
                  <Stop offset="0" stopColor="#D9F99D" />
                  <Stop offset="0.55" stopColor="#84CC16" />
                  <Stop offset="1" stopColor="#3F6212" />
                </RadialGradient>
                <RadialGradient id="dimple" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#1A2E05" stopOpacity={0.55} />
                  <Stop offset="1" stopColor="#1A2E05" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Path d={path} fill="url(#slime)" />
              {dimples.map((t, i) => (
                <Circle key={i} cx={cx + t.x} cy={cy + t.y} r={22 + 40 * t.pressure} fill="url(#dimple)" />
              ))}
              <Ellipse cx={cx - radius * 0.35} cy={cy - radius * 0.42} rx={radius * 0.22} ry={radius * 0.11} fill="#FFFFFF" opacity={0.35} />
            </Svg>
          )}
        </View>
        <Text style={styles.hint}>Press in and hold. Drag out to stretch it. Use more fingers.</Text>
      </View>
      <ToyChrome toyId="slime" />
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
  hint: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
