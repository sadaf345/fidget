import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Polygon, Polyline, Line } from 'react-native-svg';
import { createRng } from '@/lib/pick';
import { mixColor } from '@/lib/color';

const CRACK_BOX = 180;
const SHARD_BOX = 22;
const DURATION_MS = 760;

interface Shard {
  points: string;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  spin: number;
}

function makeShatter(seed: number) {
  const rng = createRng(seed);
  const c = CRACK_BOX / 2;
  const crackCount = 7;
  const elbows: { x: number; y: number }[] = [];
  const cracks = Array.from({ length: crackCount }, (_, i) => {
    const base = (i / crackCount) * Math.PI * 2 + (rng() - 0.5) * 0.5;
    const length = 30 + rng() * 45;
    const a1 = base + (rng() - 0.5) * 0.4;
    const a2 = base + (rng() - 0.5) * 0.3;
    const elbow = { x: c + Math.cos(a1) * length * 0.45, y: c + Math.sin(a1) * length * 0.45 };
    elbows.push(elbow);
    const end = { x: c + Math.cos(a2) * length, y: c + Math.sin(a2) * length };
    return `${c},${c} ${elbow.x.toFixed(1)},${elbow.y.toFixed(1)} ${end.x.toFixed(1)},${end.y.toFixed(1)}`;
  });
  // A partial ring joining the elbows gives the spider-web look.
  const web = elbows.slice(0, 5).map((p, i) => ({ from: p, to: elbows[(i + 1) % elbows.length] }));

  const shards: Shard[] = Array.from({ length: 10 }, () => {
    const angle = rng() * Math.PI * 2;
    const vertices = 3 + Math.floor(rng() * 2);
    const radius = 3.5 + rng() * 5;
    const h = SHARD_BOX / 2;
    const points = Array.from({ length: vertices }, (_, k) => {
      const a = (k / vertices) * Math.PI * 2 + (rng() - 0.5) * 0.9;
      const r = radius * (0.6 + rng() * 0.4);
      return `${(h + Math.cos(a) * r).toFixed(1)},${(h + Math.sin(a) * r).toFixed(1)}`;
    }).join(' ');
    const start = 4 + rng() * 10;
    const flight = 40 + rng() * 55;
    return {
      points,
      startX: Math.cos(angle) * start,
      startY: Math.sin(angle) * start,
      dx: Math.cos(angle) * flight,
      // Gravity pulls every shard down a little as it flies.
      dy: Math.sin(angle) * flight + 25 + rng() * 30,
      spin: (rng() > 0.5 ? 1 : -1) * (90 + rng() * 220),
    };
  });
  return { cracks, web, shards };
}

interface ShatterBurstProps {
  id: number;
  x: number;
  y: number;
  color: string;
  radius: number;
  onDone: (id: number) => void;
}

/** One glass-break at (x, y): cracks clipped to the card, shards flying free of it. */
export default function ShatterBurst({ id, x, y, color, radius, onDone }: ShatterBurstProps) {
  const t = useRef(new Animated.Value(0)).current;
  const geometry = useMemo(() => makeShatter(id * 7919 + Math.round(x * 31 + y)), [id, x, y]);
  const shardFill = mixColor(color, '#FFFFFF', 0.65);

  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: DURATION_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => onDone(id));
  }, [t, id, onDone]);

  const crackOpacity = t.interpolate({ inputRange: [0, 0.04, 0.55, 1], outputRange: [0, 1, 0.65, 0] });
  const crackScale = t.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0.6, 1, 1.03] });
  const flashScale = t.interpolate({ inputRange: [0, 0.3], outputRange: [0.2, 1.6], extrapolate: 'clamp' });
  const flashOpacity = t.interpolate({ inputRange: [0, 0.05, 0.35], outputRange: [0, 0.55, 0], extrapolate: 'clamp' });

  return (
    <>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        <Animated.View
          style={[styles.flash, { left: x - 20, top: y - 20, opacity: flashOpacity, transform: [{ scale: flashScale }] }]}
        />
        <Animated.View
          style={{ position: 'absolute', left: x - CRACK_BOX / 2, top: y - CRACK_BOX / 2, opacity: crackOpacity, transform: [{ scale: crackScale }] }}
        >
          <Svg width={CRACK_BOX} height={CRACK_BOX}>
            {geometry.cracks.map((points, i) => (
              <Polyline key={i} points={points} fill="none" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={1.2} strokeLinejoin="bevel" />
            ))}
            {geometry.web.map((w, i) => (
              <Line key={`w${i}`} x1={w.from.x} y1={w.from.y} x2={w.to.x} y2={w.to.y} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={0.8} />
            ))}
          </Svg>
        </Animated.View>
      </View>
      {geometry.shards.map((s, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: x - SHARD_BOX / 2 + s.startX,
            top: y - SHARD_BOX / 2 + s.startY,
            opacity: t.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 1, 0.8, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, s.dx] }) },
              { translateY: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, s.dy * 0.35, s.dy] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${s.spin}deg`] }) },
              { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) },
            ],
          }}
        >
          <Svg width={SHARD_BOX} height={SHARD_BOX}>
            <Polygon points={s.points} fill={shardFill} fillOpacity={0.9} stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={0.8} />
          </Svg>
        </Animated.View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  flash: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
});
