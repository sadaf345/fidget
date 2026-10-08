import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Platform, StatusBar, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { requireOptionalNativeModule } from 'expo';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { playHaptic } from '@/lib/haptics';
import { coreHaptics } from '@/lib/coreHaptics';
import { mixColor } from '@/lib/color';
import { beadAcceleration, Bead, flick, Impact, stepRattle } from '@/lib/rattle';
import { useStat } from '@/hooks/useStat';
import SensationHeader from '@/components/SensationHeader';

type AccelerometerApi = typeof import('expo-sensors').Accelerometer;

/** The accelerometer, or null in builds made before expo-sensors was added (and on web). */
function loadAccelerometer(): AccelerometerApi | null {
  if (Platform.OS === 'web' || !requireOptionalNativeModule('ExponentAccelerometer')) return null;
  // A static import would crash older builds that don't include the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('expo-sensors') as typeof import('expo-sensors')).Accelerometer;
}
const accelerometer = loadAccelerometer();

const BEAD_COLORS = ['#FF6B6B', '#FECA57', '#1DD1A1', '#54A0FF', '#A78BFA', '#FF7EC8', '#FF9F43', '#2ED3D3'];
const BEAD_COUNT = 14;
// About a sixth of real-world scale: shakes visibly throw the beads without them teleporting.
const POINTS_PER_G = 5000;
// Hits slower than this (points/s) are beads settling, not worth a vibration.
const MIN_HIT_SPEED = 140;
const MIN_HIT_GAP_MS = 28;
// A reading this far from 1 g counts as a shake.
const SHAKE_THRESHOLD_G = 1.0;
const SHAKE_GAP_MS = 350;
const JAR_RADIUS = 38;
const JAR_BORDER = 2;

const beadRadius = (i: number) => 14 + ((i * 7) % 6);

function makeBeads(width: number, height: number): Bead[] {
  const beads: Bead[] = [];
  const cols = 5;
  for (let i = 0; i < BEAD_COUNT; i++) {
    const r = beadRadius(i);
    const col = i % cols;
    const row = Math.floor(i / cols);
    beads.push({ x: (width / (cols + 1)) * (col + 1), y: height - 24 - row * 42, vx: 0, vy: 0, r });
  }
  return beads;
}

export default function ShakeScreen() {
  const insets = useSafeAreaInsets();
  const [jar, setJar] = useState({ width: 0, height: 0 });
  const { value: shakeCount, add: addShakes } = useStat('shake.shakes');

  const beads = useRef<Bead[]>([]);
  const positions = useRef(Array.from({ length: BEAD_COUNT }, () => new Animated.ValueXY({ x: -100, y: -100 }))).current;
  const reading = useRef({ x: 0, y: -1, z: 0 });
  const lastHit = useRef(0);
  const lastShake = useRef(0);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setJar(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  useEffect(() => {
    if (jar.width > 0) beads.current = makeBeads(jar.width, jar.height);
  }, [jar]);

  // Physics, sensor and haptics only run while this screen is in front.
  useFocusEffect(useCallback(() => {
    if (jar.width === 0) return;
    let frame: number | null = null;
    let last: number | null = null;

    accelerometer?.setUpdateInterval(16);
    const subscription = accelerometer?.addListener(r => {
      reading.current = r;
      const now = Date.now();
      if (Math.abs(Math.hypot(r.x, r.y, r.z) - 1) > SHAKE_THRESHOLD_G && now - lastShake.current > SHAKE_GAP_MS) {
        lastShake.current = now;
        addShakes();
      }
    });

    const feel = (impacts: Impact[]) => {
      let strongest: Impact | null = null;
      for (const hit of impacts) if (!strongest || hit.speed > strongest.speed) strongest = hit;
      const now = Date.now();
      if (!strongest || strongest.speed < MIN_HIT_SPEED || now - lastHit.current < MIN_HIT_GAP_MS) return;
      lastHit.current = now;
      const force = Math.min(1, (strongest.speed - MIN_HIT_SPEED) / 1600);
      if (coreHaptics.available) {
        // Walls thud (low sharpness), beads click against each other (high sharpness).
        coreHaptics.tap(0.25 + 0.75 * force, strongest.kind === 'wall' ? 0.45 : 0.95);
      } else if (strongest.kind === 'wall') {
        playHaptic(force > 0.6 ? 'heavy' : force > 0.25 ? 'medium' : 'light');
      } else {
        playHaptic(force > 0.5 ? 'rigid' : 'light');
      }
    };

    const tick = (ts: number) => {
      const dt = last === null ? 1 / 60 : Math.min((ts - last) / 1000, 1 / 30);
      last = ts;
      const { ax, ay } = beadAcceleration(reading.current, POINTS_PER_G);
      const impacts = stepRattle(beads.current, jar.width, jar.height, ax, ay, dt, JAR_RADIUS - JAR_BORDER);
      beads.current.forEach((b, i) => positions[i].setValue({ x: b.x - b.r, y: b.y - b.r }));
      feel(impacts);

      // Our own build adds a low hum that grows with how hard everything is moving.
      const motion = beads.current.reduce((sum, b) => sum + Math.hypot(b.vx, b.vy), 0) / beads.current.length;
      if (motion > 150) coreHaptics.set(Math.min(0.3, motion / 4000), 0.15);
      else coreHaptics.stop();

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      subscription?.remove();
      coreHaptics.stop();
    };
  }, [jar, positions, addShakes]));

  const lastFlick = useRef(0);
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: evt => {
        flick(beads.current, evt.nativeEvent.locationX, evt.nativeEvent.locationY, 170, 1500);
        playHaptic('light');
      },
      onPanResponderMove: evt => {
        const now = Date.now();
        if (now - lastFlick.current < 40) return;
        lastFlick.current = now;
        flick(beads.current, evt.nativeEvent.locationX, evt.nativeEvent.locationY, 90, 500);
      },
    });
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SensationHeader title="Shake" stat={`${shakeCount} ${shakeCount === 1 ? 'shake' : 'shakes'}`} />

      <View style={[styles.stage, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 76 }]}>
        <View style={styles.jar}>
          <View style={styles.jarInner} onLayout={handleLayout} {...panResponder.panHandlers}>
            {jar.width > 0 && positions.map((pos, i) => {
              const r = beadRadius(i);
              return (
                <Animated.View key={i} pointerEvents="none" style={[styles.bead, { width: r * 2, height: r * 2, transform: pos.getTranslateTransform() }]}>
                  <BeadArt r={r} color={BEAD_COLORS[i % BEAD_COLORS.length]} id={i} />
                </Animated.View>
              );
            })}
          </View>
          <View pointerEvents="none" style={styles.glint} />
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]} pointerEvents="none">
        <Text style={styles.hint}>
          {accelerometer ? 'Shake your phone. Tap the jar to toss them.' : 'Tap the jar to toss the beads.'}
        </Text>
        {!accelerometer && Platform.OS !== 'web' && (
          <Text style={styles.subHint}>Shaking needs the newest build of the app.</Text>
        )}
      </View>
    </View>
  );
}

const BeadArt = React.memo(function BeadArt({ r, color, id }: { r: number; color: string; id: number }) {
  return (
    <Svg width={r * 2} height={r * 2}>
      <Defs>
        <RadialGradient id={`bead${id}`} cx="35%" cy="30%" r="75%">
          <Stop offset="0" stopColor={mixColor(color, '#FFFFFF', 0.55)} />
          <Stop offset="0.45" stopColor={color} />
          <Stop offset="1" stopColor={mixColor(color, '#000000', 0.45)} />
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill={`url(#bead${id})`} />
      <Circle cx={r * 0.72} cy={r * 0.6} r={r * 0.22} fill="#FFFFFF" opacity={0.7} />
    </Svg>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  stage: {
    flex: 1,
    paddingHorizontal: 22,
  },
  jar: {
    flex: 1,
    borderRadius: JAR_RADIUS,
    borderWidth: JAR_BORDER,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    overflow: 'hidden',
  },
  jarInner: {
    flex: 1,
  },
  glint: {
    position: 'absolute',
    top: 24,
    bottom: 24,
    left: 14,
    width: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bead: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
  },
  hint: {
    fontSize: 15,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  subHint: {
    fontSize: 13,
    color: theme.textMuted,
  },
});
