import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { transient } from '@/lib/haptics';
import { angleAround, angleDelta, detentIntensity, releaseVelocity, Sample, startMomentum } from '@/lib/spin';
import { useToyOption } from '@/contexts/SettingsContext';
import Segmented from '@/components/ui/Segmented';
import ToyChrome from '@/components/ToyChrome';

const FRICTION = 0.96;
const MAX_VELOCITY = 2.5; // degrees per ms
const MIN_FLICK = 0.12;
const STOP_VELOCITY = 0.03;

export default function DialScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.78, 320);
  const center = size / 2;
  const [detent, setDetent] = useToyOption<number>('dial', 'detent', 15);

  const rotation = useRef(new Animated.Value(0)).current;
  const s = useRef({
    angle: 0,
    lastDetent: 0,
    fingerAngle: 0,
    samples: [] as Sample[],
    cancel: null as (() => void) | null,
    velocity: 0,
    detent,
  }).current;
  useEffect(() => {
    s.detent = detent;
    s.lastDetent = Math.floor(s.angle / detent);
  }, [detent, s]);
  useEffect(() => () => s.cancel?.(), [s]);

  const panResponder = useMemo(() => {
    const setAngle = (deg: number, velocity: number) => {
      s.angle = deg;
      s.velocity = velocity;
      rotation.setValue(deg);
      const notch = Math.floor(deg / s.detent);
      if (notch !== s.lastDetent) {
        s.lastDetent = notch;
        transient(detentIntensity(velocity), 0.8);
      }
    };
    const settle = () => {
      const snapped = Math.round(s.angle / s.detent) * s.detent;
      s.angle = snapped;
      Animated.spring(rotation, { toValue: snapped, friction: 8, tension: 90, useNativeDriver: true }).start();
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: evt => {
        s.cancel?.();
        s.cancel = null;
        rotation.stopAnimation();
        s.fingerAngle = angleAround(center, center, evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        s.samples = [{ t: Date.now(), value: s.angle }];
      },
      onPanResponderMove: evt => {
        const a = angleAround(center, center, evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        const delta = angleDelta(s.fingerAngle, a);
        s.fingerAngle = a;
        const now = Date.now();
        s.samples.push({ t: now, value: s.angle + delta });
        if (s.samples.length > 10) s.samples.shift();
        setAngle(s.angle + delta, releaseVelocity(s.samples, now));
      },
      onPanResponderRelease: () => {
        const v = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, releaseVelocity(s.samples, Date.now())));
        if (Math.abs(v) < MIN_FLICK) {
          settle();
          return;
        }
        s.cancel = startMomentum({
          velocity: v,
          friction: FRICTION,
          minVelocity: STOP_VELOCITY,
          onStep: d => setAngle(s.angle + d, d / 16.67),
          onEnd: () => {
            s.cancel = null;
            settle();
          },
        });
      },
      onPanResponderTerminate: settle,
    });
  }, [s, rotation, center]);

  const ticks = useMemo(() => Array.from({ length: Math.round(360 / detent) }, (_, i) => i * detent), [detent]);
  const spin = rotation.interpolate({ inputRange: [-360, 0, 360], outputRange: ['-360deg', '0deg', '360deg'] });
  const ring = size + 44;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 56 }]}>
        <View style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={ring} height={ring} style={StyleSheet.absoluteFill} pointerEvents="none">
            {ticks.map(deg => {
              const rad = ((deg - 90) * Math.PI) / 180;
              const major = deg % 90 === 0;
              const r1 = ring / 2 - 4;
              const r2 = r1 - (major ? 14 : 8);
              return (
                <Line
                  key={deg}
                  x1={ring / 2 + Math.cos(rad) * r1}
                  y1={ring / 2 + Math.sin(rad) * r1}
                  x2={ring / 2 + Math.cos(rad) * r2}
                  y2={ring / 2 + Math.sin(rad) * r2}
                  stroke={major ? theme.accent : theme.textMuted}
                  strokeWidth={major ? 3 : 2}
                  strokeLinecap="round"
                />
              );
            })}
          </Svg>
          <View
            style={{ width: size, height: size }}
            {...panResponder.panHandlers}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Ratchet dial"
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={e => {
              const step = e.nativeEvent.actionName === 'increment' ? detent : -detent;
              s.angle += step;
              rotation.setValue(s.angle);
              transient(0.5, 0.8);
            }}
          >
            <Animated.View pointerEvents="none" style={{ width: size, height: size, transform: [{ rotate: spin }] }}>
              <Knob size={size} />
            </Animated.View>
          </View>
        </View>
        <Text style={styles.hint}>Turn it with one finger. Flick to let it run.</Text>
      </View>
      <ToyChrome
        toyId="dial"
        options={
          <View style={{ gap: 8 }}>
            <Text style={styles.optionLabel}>Notch spacing</Text>
            <Segmented
              label="Notch spacing"
              value={detent}
              onChange={setDetent}
              options={[{ value: 10, label: '10°' }, { value: 15, label: '15°' }, { value: 30, label: '30°' }]}
            />
          </View>
        }
      />
    </View>
  );
}

/** A knurled metal knob with a pointer groove. */
function Knob({ size }: { size: number }) {
  const c = size / 2;
  const ridges = 72;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="metal" cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#E5E7EB" />
          <Stop offset="0.6" stopColor="#9CA3AF" />
          <Stop offset="1" stopColor="#4B5563" />
        </RadialGradient>
        <RadialGradient id="face" cx="45%" cy="40%" r="65%">
          <Stop offset="0" stopColor="#D1D5DB" />
          <Stop offset="1" stopColor="#6B7280" />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c} fill="url(#metal)" />
      {Array.from({ length: ridges }, (_, i) => {
        const rad = (i / ridges) * Math.PI * 2;
        return (
          <Line
            key={i}
            x1={c + Math.cos(rad) * c * 0.98}
            y1={c + Math.sin(rad) * c * 0.98}
            x2={c + Math.cos(rad) * c * 0.8}
            y2={c + Math.sin(rad) * c * 0.8}
            stroke="#374151"
            strokeOpacity={0.55}
            strokeWidth={2}
          />
        );
      })}
      <Circle cx={c} cy={c} r={c * 0.76} fill="url(#face)" />
      <Line x1={c} y1={c * 0.32} x2={c} y2={c * 0.72} stroke={theme.accent} strokeWidth={6} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: 40,
    fontSize: 14,
    color: theme.textMuted,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
});
