import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Line, LinearGradient, Stop } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { playHaptic } from '@/lib/haptics';
import { angleAround, angleDelta, releaseVelocity, Sample, startMomentum } from '@/lib/spin';
import { useStat } from '@/hooks/useStat';
import SensationHeader from '@/components/SensationHeader';

// A real spinner coasts for a long time; friction is velocity kept per frame.
const FRICTION = 0.988;
const MAX_VELOCITY = 6; // degrees per ms = 1000 RPM
const MIN_FLICK = 0.1;
const STOP_VELOCITY = 0.008;
// One thrum each time a lobe passes the top.
const TICK_DEG = 120;
const MIN_HAPTIC_GAP_MS = 30;

const toRpm = (degPerMs: number) => Math.round((Math.abs(degPerMs) * 1000 * 60) / 360);

export default function SpinScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.8, 330);
  const center = size / 2;
  const best = useStat('spin.bestRpm');
  const { add: addTurns, value: turns } = useStat('spin.turns');
  const [rpm, setRpm] = useState(0);

  const rotation = useRef(new Animated.Value(0)).current;
  const blur = useRef(new Animated.Value(0)).current;
  const s = useRef({
    angle: 0,
    velocity: 0,
    fingerAngle: 0,
    lastTick: 0,
    lastHaptic: 0,
    turnMark: 0,
    samples: [] as Sample[],
    cancel: null as (() => void) | null,
  }).current;

  const bestMax = best.max;
  useEffect(() => {
    // Refresh the readout a few times a second rather than every frame.
    const timer = setInterval(() => {
      const current = toRpm(s.velocity);
      setRpm(current);
      if (current > 0) bestMax(current);
    }, 120);
    return () => {
      clearInterval(timer);
      s.cancel?.();
    };
  }, [s, bestMax]);

  const panResponder = useMemo(() => {
    const setAngle = (deg: number, velocity: number) => {
      s.angle = deg;
      s.velocity = velocity;
      rotation.setValue(deg);
      blur.setValue(Math.min(1, Math.abs(velocity) / 3));

      const tick = Math.floor(deg / TICK_DEG);
      if (tick !== s.lastTick) {
        s.lastTick = tick;
        const now = Date.now();
        if (now - s.lastHaptic >= MIN_HAPTIC_GAP_MS) {
          s.lastHaptic = now;
          const speed = Math.abs(velocity);
          playHaptic(speed > 2 ? 'soft' : speed > 0.7 ? 'light' : 'medium');
        }
      }
      if (Math.abs(deg - s.turnMark) >= 360) {
        addTurns(Math.floor(Math.abs(deg - s.turnMark) / 360));
        s.turnMark = deg;
      }
    };

    const stop = () => {
      s.cancel?.();
      s.cancel = null;
      s.velocity = 0;
      blur.setValue(0);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const wasSpinning = s.cancel !== null;
        stop();
        if (wasSpinning) playHaptic('rigid');
        s.fingerAngle = angleAround(center, center, evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        s.samples = [{ t: Date.now(), value: s.angle }];
      },
      onPanResponderMove: (evt) => {
        const angle = angleAround(center, center, evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        const delta = angleDelta(s.fingerAngle, angle);
        s.fingerAngle = angle;
        const now = Date.now();
        s.samples.push({ t: now, value: s.angle + delta });
        if (s.samples.length > 12) s.samples.shift();
        setAngle(s.angle + delta, releaseVelocity(s.samples, now));
      },
      onPanResponderRelease: () => {
        const v = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, releaseVelocity(s.samples, Date.now())));
        if (Math.abs(v) < MIN_FLICK) {
          s.velocity = 0;
          blur.setValue(0);
          return;
        }
        playHaptic('medium');
        let velocity = v;
        s.cancel = startMomentum({
          velocity: v,
          friction: FRICTION,
          minVelocity: STOP_VELOCITY,
          onStep: delta => {
            velocity = delta / 16.67;
            setAngle(s.angle + delta, velocity);
          },
          onEnd: () => {
            s.cancel = null;
            s.velocity = 0;
            blur.setValue(0);
          },
        });
      },
      onPanResponderTerminate: () => {
        s.velocity = 0;
      },
    });
  }, [s, rotation, blur, center, addTurns]);

  const spin = rotation.interpolate({ inputRange: [-360, 0, 360], outputRange: ['-360deg', '0deg', '360deg'] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SensationHeader title="Spin" stat={`best ${best.value} rpm`} />

      <View style={styles.center}>
        <View style={{ width: size, height: size }} {...panResponder.panHandlers}>
          <Animated.View pointerEvents="none" style={{ width: size, height: size, transform: [{ rotate: spin }] }}>
            <SpinnerArt size={size} />
          </Animated.View>
          {/* At speed the lobes smear into a ring, like a real spinner. */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.blurRing,
              {
                width: size * 0.84,
                height: size * 0.84,
                borderRadius: size * 0.42,
                borderWidth: size * 0.2,
                left: size * 0.08,
                top: size * 0.08,
                opacity: blur.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.15, 0.55] }),
              },
            ]}
          />
        </View>
        <Text style={styles.rpm}>{rpm}</Text>
        <Text style={styles.rpmLabel}>RPM</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]} pointerEvents="none">
        <Text style={styles.hint}>Flick it around. Touch to stop.</Text>
        <Text style={styles.turns}>{turns.toLocaleString()} turns all time</Text>
      </View>
    </View>
  );
}

function SpinnerArt({ size }: { size: number }) {
  const c = size / 2;
  const armRadius = size * 0.31;
  const lobe = size * 0.19;
  const lobes = [-90, 30, 150].map(deg => {
    const rad = (deg * Math.PI) / 180;
    return { x: c + Math.cos(rad) * armRadius, y: c + Math.sin(rad) * armRadius };
  });
  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#B49BFF" />
          <Stop offset="1" stopColor="#7B5CF0" />
        </LinearGradient>
        <LinearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F4F5FA" />
          <Stop offset="1" stopColor="#9EA3B5" />
        </LinearGradient>
      </Defs>
      <G>
        {lobes.map((p, i) => (
          <Line key={`arm${i}`} x1={c} y1={c} x2={p.x} y2={p.y} stroke="url(#body)" strokeWidth={lobe * 1.25} strokeLinecap="round" />
        ))}
        <Circle cx={c} cy={c} r={size * 0.2} fill="url(#body)" />
        {lobes.map((p, i) => (
          <React.Fragment key={`lobe${i}`}>
            <Circle cx={p.x} cy={p.y} r={lobe} fill="url(#body)" />
            <Circle cx={p.x} cy={p.y} r={lobe * 0.62} fill="url(#metal)" stroke="#6E7386" strokeWidth={2} />
            <Circle cx={p.x} cy={p.y} r={lobe * 0.28} fill="#5B6072" />
          </React.Fragment>
        ))}
        <Circle cx={c} cy={c} r={size * 0.13} fill="url(#metal)" stroke="#6E7386" strokeWidth={2} />
        <Circle cx={c} cy={c} r={size * 0.075} fill="#D8DBE6" stroke="#8A8FA0" strokeWidth={1.5} />
        <Circle cx={c - size * 0.025} cy={c - size * 0.025} r={size * 0.02} fill="#FFFFFF" opacity={0.8} />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurRing: {
    position: 'absolute',
    borderColor: '#9B7FF8',
  },
  rpm: {
    marginTop: 40,
    fontSize: 56,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  rpmLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textMuted,
    letterSpacing: 2,
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
  turns: {
    fontSize: 13,
    color: theme.textMuted,
    fontVariant: ['tabular-nums'],
  },
});
