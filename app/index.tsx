import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar, Animated, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ChevronRight, FolderOpen, Gamepad2, Plus, Zap } from 'lucide-react-native';
import { theme } from '@/constants/colors';
import { playHaptic } from '@/lib/haptics';
import { useSavedFidgets } from '@/contexts/SavedFidgetContext';
import { ChargeArt, PickArt, PopArt, SpinArt } from '@/components/home/SensationArt';

const SENSATIONS = [
  { route: '/pick', title: 'Pick', line: 'Find a rough spot. Peel it off.', color: '#E8A87C', Art: () => <PickArt /> },
  { route: '/pop', title: 'Pop', line: 'A pop-it that never runs out.', color: '#FF7EC8', Art: () => <PopArt /> },
  { route: '/charge', title: 'Charge', line: 'Hold. Build. Release.', color: theme.accent, Art: () => <ChargeArt color={theme.accent} /> },
  { route: '/spin', title: 'Spin', line: 'Flick it and let it coast.', color: '#A78BFA', Art: () => <SpinArt color="#A78BFA" /> },
] as const;

/** Fades and slides children in after `delay` ms. */
function Entrance({ delay, children }: { delay: number; children: React.ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 450, delay, useNativeDriver: true }).start();
  }, [t, delay]);
  return (
    <Animated.View style={{ opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

/**
 * Press feedback for the home menu. The highlight comes from Pressable's own pressed state,
 * which re-renders correctly when you come back to this screen; the scale runs on the native
 * thread and is reset on focus, so nothing can stay stuck pressed after navigating.
 */
function useTactile() {
  const scale = useRef(new Animated.Value(1)).current;
  useFocusEffect(useCallback(() => {
    scale.setValue(1);
  }, [scale]));
  return {
    scale,
    onPressIn: () => {
      playHaptic('light');
      Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 7, tension: 300 }).start();
    },
    onPressOut: () => {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 200 }).start();
    },
  };
}

function SensationTile({ title, line, color, Art, onPress, width }: {
  title: string;
  line: string;
  color: string;
  Art: () => React.ReactElement;
  onPress: () => void;
  width: number;
}) {
  const { scale, onPressIn, onPressOut } = useTactile();
  return (
    <Animated.View style={{ width, transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        {({ pressed }) => (
          <View style={[styles.tile, pressed && { borderColor: color }]}>
            <Svg width={width} height={140} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Defs>
                <RadialGradient id={`glow-${title}`} cx="85%" cy="10%" r="80%">
                  <Stop offset="0" stopColor={color} stopOpacity={pressed ? 0.4 : 0.22} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width={width} height={140} fill={`url(#glow-${title})`} />
            </Svg>
            <View style={styles.tileArt}>
              <Art />
            </View>
            <View style={styles.tileText}>
              <Text style={styles.tileTitle}>{title}</Text>
              <Text style={styles.tileLine} numberOfLines={2}>{line}</Text>
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function BuildRow({ icon, title, subtitle, onPress }: { icon: React.ReactNode; title: string; subtitle: string; onPress: () => void }) {
  const { scale, onPressIn, onPressOut } = useTactile();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        {({ pressed }) => (
          <View style={[styles.row, pressed && styles.rowPressed]}>
            <View style={styles.rowIcon}>{icon}</View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{title}</Text>
              <Text style={styles.rowSubtitle}>{subtitle}</Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { fidgets } = useSavedFidgets();
  const tileWidth = (Math.min(width, 520) - 20 * 2 - 12) / 2;

  const go = (route: string) => router.push(route as any);
  const boardCount = fidgets.length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <Entrance delay={0}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>fidget</Text>
            <View style={styles.brandDot} />
          </View>
          <Text style={styles.tagline}>something for your hands</Text>
        </Entrance>

        <Entrance delay={100}>
          <Text style={styles.section}>Feel</Text>
          <View style={styles.grid}>
            {SENSATIONS.map(s => (
              <SensationTile key={s.title} {...s} width={tileWidth} onPress={() => go(s.route)} />
            ))}
          </View>
        </Entrance>

        <Entrance delay={220}>
          <Text style={styles.section}>Build</Text>
          <View style={styles.rows}>
            <BuildRow
              icon={<Gamepad2 size={20} color="#A78BFA" />}
              title="Playground"
              subtitle="Mix widgets on a free-form board"
              onPress={() => go('/playground')}
            />
            <BuildRow
              icon={<Plus size={20} color={theme.accent} />}
              title="New board"
              subtitle="Arrange widgets, name it, keep it"
              onPress={() => go('/create')}
            />
            <BuildRow
              icon={<FolderOpen size={20} color="#F7B267" />}
              title="My boards"
              subtitle={boardCount === 0 ? 'Nothing saved yet' : `${boardCount} saved`}
              onPress={() => go('/my-widgets')}
            />
          </View>
        </Entrance>

        <Entrance delay={320}>
          <Pressable
            onPress={() => go('/haptics')}
            style={({ pressed }) => [styles.labLink, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Zap size={14} color={theme.textMuted} />
            <Text style={styles.labText}>Haptics Lab</Text>
          </Pressable>
        </Entrance>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    paddingHorizontal: 20,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  brand: {
    fontSize: 44,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -2,
  },
  brandDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: theme.accent,
    marginBottom: 11,
  },
  tagline: {
    fontSize: 16,
    color: theme.textSecondary,
    marginTop: 2,
  },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 30,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    height: 140,
    borderRadius: 24,
    padding: 16,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  tileArt: {
    width: 52,
    height: 52,
  },
  tileText: {
    gap: 2,
  },
  tileTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.4,
  },
  tileLine: {
    fontSize: 12.5,
    color: theme.textSecondary,
    lineHeight: 16,
  },
  rows: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rowPressed: {
    backgroundColor: theme.surfaceLight,
    borderColor: theme.borderLight,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: theme.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  rowSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 1,
  },
  labLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 28,
    paddingVertical: 8,
  },
  labText: {
    fontSize: 14,
    color: theme.textMuted,
    fontWeight: '600',
  },
});
