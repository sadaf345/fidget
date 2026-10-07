import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { playHaptic } from '@/lib/haptics';

interface SensationHeaderProps {
  title: string;
  /** Small stat shown on the right, e.g. "128 picked". */
  stat?: string;
  /** Use dark text for light backgrounds. */
  tone?: 'light' | 'dark';
}

/** Floating back button + title for the full-screen sensations. Doesn't block touches elsewhere. */
export default function SensationHeader({ title, stat, tone = 'light' }: SensationHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fg = tone === 'light' ? '#F0F0F5' : '#2A1E18';
  const pill = tone === 'light' ? 'rgba(22,22,31,0.72)' : 'rgba(255,255,255,0.55)';

  return (
    <View pointerEvents="box-none" style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <Pressable
        onPress={() => {
          playHaptic('light');
          router.back();
        }}
        hitSlop={10}
        style={({ pressed }) => [styles.back, { backgroundColor: pill, opacity: pressed ? 0.6 : 1 }]}
      >
        <ChevronLeft size={20} color={fg} />
      </Pressable>
      <Text style={[styles.title, { color: fg }]}>{title}</Text>
      <View style={styles.right} pointerEvents="none">
        {stat ? (
          <View style={[styles.statPill, { backgroundColor: pill }]}>
            <Text style={[styles.stat, { color: fg }]}>{stat}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  right: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  stat: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
