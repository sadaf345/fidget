import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, LayoutChangeEvent, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { continuous, transient } from '@/lib/haptics';
import { accelerometer } from '@/lib/motion';
import { createRng } from '@/lib/pick';
import { Flake, Globe, makeFlakes, SETTLE_SECONDS, stepSnow, swirl } from '@/lib/snow';
import ToyChrome from '@/components/ToyChrome';

const FLAKES = 90;
// A reading this far from 1 g is a shake.
const SHAKE_G = 0.8;

export default function SnowGlobeScreen() {
  const insets = useSafeAreaInsets();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [, setFrame] = useState(0);
  const rng = useRef(createRng(7)).current;
  const flakes = useRef<Flake[]>([]);
  const s = useRef({ energy: 0, gravity: { x: 0, y: 1 }, lastShake: 0 }).current;

  const globe = useMemo<Globe | null>(() => {
    if (area.width === 0) return null;
    const radius = Math.min(area.width * 0.42, area.height * 0.36, 175);
    const cx = area.width / 2;
    const cy = area.height * 0.42;
    return { cx, cy, radius, groundY: cy + radius * 0.55 };
  }, [area]);

  const shake = useCallback((strength: number) => {
    if (!globe) return;
    swirl(flakes.current, globe, strength, rng);
    s.energy = Math.max(s.energy, Math.min(1, strength));
  }, [globe, rng, s]);

  // Physics, sensor and haptics only while the screen is in front (saves battery).
  useFocusEffect(useCallback(() => {
    if (!globe) return;
    if (flakes.current.length === 0) flakes.current = makeFlakes(globe, FLAKES, rng);
    let frame: number | null = null;
    let last: number | null = null;
    let tick = 0;

    accelerometer?.setUpdateInterval(16);
    const sub = accelerometer?.addListener(r => {
      // Snow falls toward wherever "down" is as you tilt.
      const len = Math.hypot(r.x, r.y) || 1;
      s.gravity = { x: r.x / len, y: -r.y / len };
      const jolt = Math.abs(Math.hypot(r.x, r.y, r.z) - 1);
      if (jolt > SHAKE_G) {
        const now = Date.now();
        if (now - s.lastShake > 60) {
          s.lastShake = now;
          shake(Math.min(1, jolt / 2.5));
        }
      }
    });

    const step = (ts: number) => {
      const dt = last === null ? 1 / 60 : Math.min((ts - last) / 1000, 1 / 30);
      last = ts;
      stepSnow(flakes.current, globe, dt, s.gravity.x, s.gravity.y);
      // The rumble dies away over 3 s as the flakes settle.
      s.energy = Math.max(0, s.energy - dt / SETTLE_SECONDS);
      if (s.energy > 0.01) continuous.set(0.6 * s.energy, 0.3);
      else continuous.stop();
      // Redraw at 30 fps; the flakes move slowly enough.
      tick += 1;
      if (tick % 2 === 0) setFrame(f => f + 1);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      sub?.remove();
      continuous.stop();
    };
  }, [globe, rng, s, shake]));

  const stir = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      transient(0.4, 0.3);
      shake(0.6);
    },
    onPanResponderMove: (_, gs) => {
      if (Math.hypot(gs.vx, gs.vy) > 0.6) shake(0.35);
    },
  }), [shake]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        <View
          style={styles.area}
          onLayout={(e: LayoutChangeEvent) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          {...stir.panHandlers}
          accessible
          accessibilityLabel="Snow globe. Shake the phone, or stir it with your finger."
        >
          {globe && (
            <Svg width={area.width} height={area.height} pointerEvents="none">
              <Defs>
                <RadialGradient id="glass" cx="50%" cy="40%" r="60%">
                  <Stop offset="0" stopColor="#1E3A5F" />
                  <Stop offset="1" stopColor="#0B1426" />
                </RadialGradient>
                <ClipPath id="inside">
                  <Circle cx={globe.cx} cy={globe.cy} r={globe.radius} />
                </ClipPath>
                <RadialGradient id="shine" cx="30%" cy="25%" r="40%">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x={globe.cx - globe.radius * 0.8} y={globe.cy + globe.radius * 0.88} width={globe.radius * 1.6} height={globe.radius * 0.42} rx={14} fill="#6B4226" />
              <Rect x={globe.cx - globe.radius * 0.9} y={globe.cy + globe.radius * 1.22} width={globe.radius * 1.8} height={globe.radius * 0.16} rx={8} fill="#4A2C17" />
              <Circle cx={globe.cx} cy={globe.cy} r={globe.radius} fill="url(#glass)" />
              <G clipPath="url(#inside)">
                <Path d={`M ${globe.cx - globe.radius} ${globe.groundY} Q ${globe.cx} ${globe.groundY - 18} ${globe.cx + globe.radius} ${globe.groundY} L ${globe.cx + globe.radius} ${globe.cy + globe.radius} L ${globe.cx - globe.radius} ${globe.cy + globe.radius} Z`} fill="#E2E8F0" />
                <Path d={`M ${globe.cx - 52} ${globe.groundY - 6} l 20 -46 l 20 46 Z`} fill="#166534" />
                <Path d={`M ${globe.cx - 47} ${globe.groundY - 26} l 15 -36 l 15 36 Z`} fill="#15803D" />
                <Rect x={globe.cx + 6} y={globe.groundY - 40} width={44} height={34} fill="#B45309" />
                <Path d={`M ${globe.cx} ${globe.groundY - 38} l 28 -24 l 28 24 Z`} fill="#7C2D12" />
                <Rect x={globe.cx + 22} y={globe.groundY - 24} width={12} height={18} fill="#FCD34D" />
                {flakes.current.map((f, i) => <Circle key={i} cx={f.x} cy={f.y} r={f.r} fill="#FFFFFF" opacity={0.9} />)}
              </G>
              <Circle cx={globe.cx} cy={globe.cy} r={globe.radius} fill="url(#shine)" />
              <Ellipse cx={globe.cx - globe.radius * 0.45} cy={globe.cy - globe.radius * 0.5} rx={globe.radius * 0.16} ry={globe.radius * 0.07} fill="#FFFFFF" opacity={0.25} transform={`rotate(-35 ${globe.cx - globe.radius * 0.45} ${globe.cy - globe.radius * 0.5})`} />
              <Circle cx={globe.cx} cy={globe.cy} r={globe.radius} fill="none" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={2} />
            </Svg>
          )}
        </View>
        <Text style={styles.hint}>{accelerometer ? 'Give it a shake. Watch it settle.' : 'Stir it with your finger.'}</Text>
      </View>
      <ToyChrome toyId="snow" />
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
  },
});
