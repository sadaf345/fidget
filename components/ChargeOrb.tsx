import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '@/constants/colors';
import { ChargeHandle } from '@/hooks/useCharge';

interface ChargeOrbProps {
  size: number;
  handle: ChargeHandle;
  color?: string;
  /** Show the ×N repeat counter on the orb itself. */
  showCombo?: boolean;
}

/** The press-and-hold orb. Touches go to the outer ring; everything inside ignores them. */
export default function ChargeOrb({ size, handle, color = theme.accent, showCombo = true }: ChargeOrbProps) {
  const { charge, pulse, climax, pressing, combo, panHandlers } = handle;
  const inner = size * 0.84;

  const scale = Animated.subtract(1, Animated.add(Animated.multiply(charge, 0.1), Animated.multiply(pulse, 0.035)));
  const fillScale = charge.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
  const fillOpacity = charge.interpolate({ inputRange: [0, 1], outputRange: [0, 0.75] });
  const coreOpacity = charge.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 0.15, 0.9] });
  const flashOpacity = climax.interpolate({ inputRange: [0, 0.08, 0.5, 1], outputRange: [0, 1, 0.2, 0] });
  const waveScale = climax.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const waveOpacity = climax.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 0.9, 0] });
  const wave2Scale = climax.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 1, 2] });
  const wave2Opacity = climax.interpolate({ inputRange: [0, 0.2, 0.25, 1], outputRange: [0, 0, 0.6, 0] });

  const circle = (d: number) => ({ width: d, height: d, borderRadius: d / 2 });

  return (
    <View style={[styles.container, circle(size)]}>
      <Animated.View pointerEvents="none" style={[styles.wave, circle(size), { borderColor: color, opacity: waveOpacity, transform: [{ scale: waveScale }] }]} />
      <Animated.View pointerEvents="none" style={[styles.wave, circle(size), { borderColor: color, opacity: wave2Opacity, transform: [{ scale: wave2Scale }] }]} />
      <Animated.View
        {...panHandlers}
        style={[
          styles.ring,
          circle(size),
          pressing && { borderColor: color, shadowColor: color, shadowOpacity: 0.6 },
          { transform: [{ scale }] },
        ]}
      >
        <View pointerEvents="none" style={[styles.inner, circle(inner), pressing && styles.innerActive]}>
          <Animated.View style={[styles.absolute, circle(inner), { backgroundColor: color, opacity: fillOpacity, transform: [{ scale: fillScale }] }]} />
          <Animated.View style={[styles.absolute, circle(inner * 0.35), styles.core, { opacity: coreOpacity }]} />
          <Animated.View style={[styles.absolute, circle(inner), styles.flash, { opacity: flashOpacity }]} />
        </View>
      </Animated.View>
      {showCombo && combo >= 2 && (
        <View pointerEvents="none" style={[styles.comboBadge, { backgroundColor: color }]}>
          <Text style={styles.comboText}>×{combo}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  absolute: {
    position: 'absolute',
  },
  wave: {
    position: 'absolute',
    borderWidth: 3,
  },
  ring: {
    borderWidth: 2,
    borderColor: '#3A3A4A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E0E14',
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  inner: {
    backgroundColor: '#1A1A24',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  innerActive: {
    backgroundColor: '#1E3A38',
  },
  core: {
    backgroundColor: '#FFFFFF',
  },
  flash: {
    backgroundColor: '#FFFFFF',
  },
  comboBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  comboText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.bg,
  },
});
