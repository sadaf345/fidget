import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { useCharge } from '@/hooks/useCharge';
import { useStat } from '@/hooks/useStat';
import ChargeOrb from '@/components/ChargeOrb';
import SensationHeader from '@/components/SensationHeader';

const COLOR = theme.accent;

export default function ChargeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const orbSize = Math.min(width * 0.62, 260);
  const releases = useStat('charge.releases');
  const bestCombo = useStat('charge.bestCombo');

  const handleClimax = useCallback((combo: number) => {
    releases.add();
    bestCombo.max(combo);
  }, [releases, bestCombo]);

  const handle = useCharge({ center: { x: orbSize / 2, y: orbSize / 2 }, onClimax: handleClimax });

  const glowOpacity = handle.charge.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.75] });
  const flashOpacity = handle.climax.interpolate({ inputRange: [0, 0.06, 1], outputRange: [0, 0.35, 0] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="47%" r="60%">
              <Stop offset="0" stopColor={COLOR} stopOpacity={0.55} />
              <Stop offset="0.45" stopColor={COLOR} stopOpacity={0.12} />
              <Stop offset="1" stopColor={COLOR} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={width} height={height} fill="url(#glow)" />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: flashOpacity }]} />

      <SensationHeader title="Charge" stat={`${releases.value} ${releases.value === 1 ? 'release' : 'releases'}`} />

      <View style={styles.center}>
        <ChargeOrb size={orbSize} handle={handle} color={COLOR} showCombo={false} />
        <View style={styles.comboArea}>
          {handle.combo > 0 ? (
            <Text style={styles.combo}>×{handle.combo}</Text>
          ) : (
            <Text style={styles.prompt}>Press and hold</Text>
          )}
          {bestCombo.value > 1 && <Text style={styles.best}>best ×{bestCombo.value}</Text>}
        </View>
      </View>

      <View style={[styles.hints, { paddingBottom: insets.bottom + 20 }]} pointerEvents="none">
        <Text style={styles.hint}><Text style={styles.hintStrong}>Hold</Text> to build it up</Text>
        <Text style={styles.hint}><Text style={styles.hintStrong}>Circle clockwise</Text> to wind it faster</Text>
        <Text style={styles.hint}><Text style={styles.hintStrong}>Circle back</Text> to hold off the edge</Text>
        <Text style={styles.hint}><Text style={styles.hintStrong}>Keep holding</Text> after the release to go again</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  flash: {
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comboArea: {
    height: 90,
    marginTop: 36,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  combo: {
    fontSize: 54,
    fontWeight: '900',
    color: COLOR,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  prompt: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.textSecondary,
    marginTop: 12,
  },
  best: {
    fontSize: 13,
    color: theme.textMuted,
    marginTop: 2,
  },
  hints: {
    paddingHorizontal: 28,
    gap: 6,
    alignItems: 'center',
  },
  hint: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
  },
  hintStrong: {
    color: theme.textSecondary,
    fontWeight: '700',
  },
});
