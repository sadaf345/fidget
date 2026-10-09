import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/colors';
import { continuous, transient } from '@/lib/haptics';
import { breathIntensity, breathSize, PATTERNS, phaseAt, PhaseKind } from '@/lib/breathe';
import { useToyOption } from '@/contexts/SettingsContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Segmented from '@/components/ui/Segmented';
import ToyChrome from '@/components/ToyChrome';
import { sound, useLoop } from '@/lib/sound/engine';

type PatternId = keyof typeof PATTERNS;

const LABELS: Record<PhaseKind, string> = { inhale: 'Breathe in', hold: 'Hold', exhale: 'Breathe out' };
const COLOR = '#818CF8';

export default function BreatheScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [pattern, setPattern] = useToyOption<PatternId>('breathe', 'pattern', 'box');
  const [minutes, setMinutes] = useToyOption<number>('breathe', 'minutes', 3);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [readout, setReadout] = useState({ label: 'Breathe in', count: 4, left: 0 });
  const size = useRef(new Animated.Value(0)).current;
  // An airy breath: brighter and fuller on the way in, fading on the way out.
  const breath = useLoop('noise', { type: 'bandpass', freq: 600, q: 0.7 });
  const s = useRef({ frame: null as number | null, started: 0, lastCount: -1, lastIndex: -1 }).current;
  const circle = Math.min(width * 0.72, 300);

  const stop = useCallback((completed: boolean) => {
    if (s.frame !== null) cancelAnimationFrame(s.frame);
    s.frame = null;
    continuous.stop();
    breath.stop(300);
    setRunning(false);
    setFinished(completed);
    Animated.timing(size, { toValue: 0, duration: 600, useNativeDriver: true }).start();
    if (completed) {
      transient(0.4, 0.2);
      sound.play('chime', { volume: 0.6 });
    }
  }, [s, size, breath]);

  useEffect(() => () => {
    if (s.frame !== null) cancelAnimationFrame(s.frame);
  }, [s]);

  const start = () => {
    const phases = PATTERNS[pattern];
    const sessionMs = minutes * 60 * 1000;
    s.started = Date.now();
    s.lastCount = -1;
    s.lastIndex = -1;
    setRunning(true);
    setFinished(false);
    const tick = () => {
      const elapsed = Date.now() - s.started;
      if (elapsed >= sessionMs) {
        stop(true);
        return;
      }
      const at = phaseAt(phases, elapsed);
      size.setValue(reduced ? (at.phase.kind === 'inhale' || breathSize(phases, at) === 1 ? 1 : 0) : breathSize(phases, at));
      if (at.phase.kind === 'hold') {
        // A faint pulse each second of the hold.
        if (at.index !== s.lastIndex) {
          continuous.stop();
          breath.stop(250);
        }
        if (at.countdown !== s.lastCount) {
          transient(0.1, 0.1);
          sound.play('tick', { volume: 0.15, rate: 0.6, vary: 0 });
        }
      } else {
        continuous.set(breathIntensity(at.phase.kind, at.progress), 0.2);
        const swell = at.phase.kind === 'inhale' ? at.progress : 1 - at.progress;
        breath.set({ volume: 0.05 + 0.3 * swell, freq: 500 + 900 * swell });
      }
      if (at.countdown !== s.lastCount || at.index !== s.lastIndex) {
        s.lastCount = at.countdown;
        s.lastIndex = at.index;
        setReadout({ label: LABELS[at.phase.kind], count: at.countdown, left: Math.ceil((sessionMs - elapsed) / 1000) });
      }
      s.frame = requestAnimationFrame(tick);
    };
    s.frame = requestAnimationFrame(tick);
  };

  const scale = size.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  const mm = Math.floor(readout.left / 60);
  const ss = String(readout.left % 60).padStart(2, '0');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.circleWrap, { width: circle, height: circle }]}>
          <View style={[styles.ring, { width: circle, height: circle, borderRadius: circle / 2 }]} />
          <Animated.View style={[styles.circle, { width: circle, height: circle, borderRadius: circle / 2, transform: [{ scale }] }]} />
          <View style={styles.center} accessibilityLiveRegion="polite">
            {running ? (
              <>
                <Text style={styles.phase} maxFontSizeMultiplier={1.4}>{readout.label}</Text>
                <Text style={styles.count} maxFontSizeMultiplier={1.4}>{readout.count}</Text>
              </>
            ) : (
              <Text style={styles.phase} maxFontSizeMultiplier={1.4}>{finished ? 'Nicely done.' : 'Ready when you are.'}</Text>
            )}
          </View>
        </View>

        {running ? (
          <View style={styles.controls}>
            <Text style={styles.left}>{mm}:{ss} left</Text>
            <Pressable onPress={() => stop(false)} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <Text style={styles.buttonText}>Stop</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.controls}>
            <Segmented label="Pattern" value={pattern} onChange={setPattern} options={[{ value: 'box', label: 'Box 4-4-4-4' }, { value: '478', label: '4-7-8' }]} />
            <Segmented label="Session length" value={minutes} onChange={setMinutes} options={[{ value: 1, label: '1 min' }, { value: 3, label: '3 min' }, { value: 5, label: '5 min' }]} />
            <Pressable onPress={start} style={({ pressed }) => [styles.button, styles.startButton, pressed && { opacity: 0.8 }]} accessibilityRole="button">
              <Text style={[styles.buttonText, styles.startText]}>Start</Text>
            </Pressable>
            <Text style={styles.note}>Close your eyes if you like. You can feel every phase.</Text>
          </View>
        )}
      </View>
      <ToyChrome toyId="breathe" keepAwake={running} />
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
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
  },
  circleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLOR + '55',
  },
  circle: {
    position: 'absolute',
    backgroundColor: COLOR + '40',
    borderWidth: 2,
    borderColor: COLOR,
  },
  center: {
    alignItems: 'center',
  },
  phase: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
  },
  count: {
    fontSize: 54,
    fontWeight: '900',
    color: theme.text,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    width: '100%',
    gap: 12,
    alignItems: 'stretch',
  },
  left: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  button: {
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  startButton: {
    backgroundColor: COLOR,
    borderColor: COLOR,
  },
  startText: {
    color: '#11113A',
  },
  note: {
    fontSize: 13,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
