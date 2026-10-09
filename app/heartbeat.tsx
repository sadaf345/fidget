import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Pause, Play } from 'lucide-react-native';
import { theme } from '@/constants/colors';
import { transient } from '@/lib/haptics';
import { useToyOption } from '@/contexts/SettingsContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Slider from '@/components/ui/Slider';
import ToyChrome from '@/components/ToyChrome';

const DUB_DELAY_MS = 120;
const COLOR = '#FB7185';
const HEART = 'M 50 88 C 22 66 4 50 4 30 C 4 14 16 4 30 4 C 39 4 46 9 50 16 C 54 9 61 4 70 4 C 84 4 96 14 96 30 C 96 50 78 66 50 88 Z';

export default function HeartbeatScreen() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [bpm, setBpm] = useToyOption<number>('heartbeat', 'bpm', 60);
  const [running, setRunning] = useState(true);
  const beat = useRef(new Animated.Value(0)).current;
  const s = useRef({ timers: [] as ReturnType<typeof setTimeout>[], bpm }).current;

  useEffect(() => {
    s.bpm = bpm;
  }, [bpm, s]);

  const pulse = (to: number) => {
    if (reduced) return;
    beat.setValue(to);
    Animated.timing(beat, { toValue: 0, duration: 260, useNativeDriver: true }).start();
  };

  // "Lub", then "dub" 120 ms later, repeated at the chosen rate, only while the screen is open.
  useFocusEffect(React.useCallback(() => {
    if (!running) return;
    const clear = () => s.timers.forEach(clearTimeout);
    const loop = () => {
      transient(0.8, 0.2);
      pulse(1);
      s.timers.push(setTimeout(() => {
        transient(0.5, 0.2);
        pulse(0.6);
      }, DUB_DELAY_MS));
      s.timers.push(setTimeout(loop, 60000 / s.bpm));
    };
    loop();
    return () => {
      clear();
      s.timers = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, s]));

  const scale = beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View style={{ transform: [{ scale }] }} accessible accessibilityLabel={`Heartbeat at ${bpm} beats per minute`}>
          <Svg width={220} height={200} viewBox="0 0 100 92">
            <Path d={HEART} fill={COLOR} />
            <Path d="M 22 24 C 26 14 36 12 40 16" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={4} strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>
        <View style={styles.controls}>
          <Slider label="Pace" value={bpm} min={50} max={80} step={1} format={v => `${Math.round(v)} bpm`} onChange={v => setBpm(Math.round(v))} color={COLOR} />
          <Pressable
            onPress={() => setRunning(r => !r)}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={running ? 'Pause' : 'Play'}
          >
            {running ? <Pause size={18} color={theme.text} /> : <Play size={18} color={theme.text} />}
            <Text style={styles.buttonText}>{running ? 'Pause' : 'Play'}</Text>
          </Pressable>
          <Text style={styles.note}>Rest your hand on the phone and let your breathing follow it.</Text>
        </View>
      </View>
      <ToyChrome toyId="heartbeat" keepAwake={running} />
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
    paddingHorizontal: 24,
  },
  controls: {
    width: '100%',
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  note: {
    fontSize: 13,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
