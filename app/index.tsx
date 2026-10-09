import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar, Animated, ScrollView, useWindowDimensions, AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, FolderOpen, Gamepad2, Plus, Settings2, Star, Zap } from 'lucide-react-native';
import { theme } from '@/constants/colors';
import { CATEGORIES, Toy, ToyIcon, TOYS, TOYS_BY_ID } from '@/constants/toys';
import { playHaptic } from '@/lib/haptics';
import { useSavedFidgets } from '@/contexts/SavedFidgetContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const TILE_HEIGHT = 156;
const GAP = 12;
const SIDE = 20;

/** Fades and slides children in after `delay` ms (just fades with Reduce Motion on). */
function Entrance({ delay, children }: { delay: number; children: React.ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 450, delay, useNativeDriver: true }).start();
  }, [t, delay]);
  return (
    <Animated.View style={{ opacity: t, transform: reduced ? [] : [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
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

function ToyTile({ toy, width, favorite, onOpen, onToggleFavorite }: {
  toy: Toy;
  width: number;
  favorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const { scale, onPressIn, onPressOut } = useTactile();
  return (
    <Animated.View style={{ width, transform: [{ scale }] }}>
      <Pressable
        onPress={onOpen}
        onLongPress={onToggleFavorite}
        delayLongPress={380}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${toy.title}. ${toy.line}${favorite ? '. Favorite' : ''}`}
        accessibilityHint="Opens the toy. Long-press to add or remove from favorites."
        accessibilityActions={[{ name: 'longpress', label: favorite ? 'Remove from favorites' : 'Add to favorites' }]}
        onAccessibilityAction={e => e.nativeEvent.actionName === 'longpress' && onToggleFavorite()}
      >
        {({ pressed }) => (
          <View style={[styles.tile, pressed && { borderColor: toy.color }]}>
            <View style={styles.tileTop}>
              <ToyIcon toy={toy} />
              {favorite && <Star size={16} color="#FBBF24" fill="#FBBF24" />}
            </View>
            <View style={styles.tileText}>
              <Text style={styles.tileTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>{toy.title}</Text>
              <Text style={styles.tileLine} numberOfLines={2} maxFontSizeMultiplier={1.3}>{toy.line}</Text>
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
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`}>
        {({ pressed }) => (
          <View style={[styles.row, pressed && styles.rowPressed]}>
            <View style={styles.rowIcon}>{icon}</View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} maxFontSizeMultiplier={1.4}>{title}</Text>
              <Text style={styles.rowSubtitle} maxFontSizeMultiplier={1.4}>{subtitle}</Text>
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
  const { settings, toggleFavorite } = useSettings();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tileWidth = (Math.min(width, 520) - SIDE * 2 - GAP) / 2;

  const go = (route: string) => router.push(route as any);

  const favorite = useCallback((toy: Toy) => {
    const adding = !settings.favorites.includes(toy.id);
    playHaptic(adding ? 'success' : 'medium');
    toggleFavorite(toy.id);
    const message = adding ? `${toy.title} added to favorites` : `${toy.title} removed from favorites`;
    setToast(message);
    AccessibilityInfo.announceForAccessibility(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, [settings.favorites, toggleFavorite]);

  const favorites = settings.favorites.map(id => TOYS_BY_ID[id]).filter(Boolean);

  const tile = (toy: Toy) => (
    <ToyTile
      key={toy.id}
      toy={toy}
      width={tileWidth}
      favorite={settings.favorites.includes(toy.id)}
      onOpen={() => go(toy.route)}
      onToggleFavorite={() => favorite(toy)}
    />
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <Entrance delay={0}>
          <View style={styles.brandRow}>
            <View>
              <View style={styles.brandMark}>
                <Text style={styles.brand} accessibilityRole="header">fidgetr</Text>
                <View style={styles.brandDot} />
              </View>
              <Text style={styles.tagline}>something for your hands</Text>
            </View>
            <Pressable
              onPress={() => go('/settings')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={({ pressed }) => [styles.gear, pressed && { opacity: 0.6 }]}
            >
              <Settings2 size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
        </Entrance>

        <Entrance delay={80}>
          <Text style={styles.section}>Favorites</Text>
          {favorites.length > 0 ? (
            <View style={styles.grid}>{favorites.map(tile)}</View>
          ) : (
            <View style={styles.emptyFavorites}>
              <Star size={16} color={theme.textMuted} />
              <Text style={styles.emptyText}>Long-press any toy to pin it here.</Text>
            </View>
          )}
        </Entrance>

        {CATEGORIES.map((category, i) => (
          <Entrance key={category.id} delay={140 + i * 50}>
            <Text style={styles.section}>{category.title}</Text>
            <View style={styles.grid}>{TOYS.filter(t => t.category === category.id).map(tile)}</View>
          </Entrance>
        ))}

        <Entrance delay={480}>
          <Text style={styles.section}>Build</Text>
          <View style={styles.rows}>
            <BuildRow icon={<Gamepad2 size={20} color="#A78BFA" />} title="Playground" subtitle="Mix widgets on a free-form board" onPress={() => go('/playground')} />
            <BuildRow icon={<Plus size={20} color={theme.accent} />} title="New board" subtitle="Arrange widgets, name it, keep it" onPress={() => go('/create')} />
            <BuildRow
              icon={<FolderOpen size={20} color="#F7B267" />}
              title="My boards"
              subtitle={fidgets.length === 0 ? 'Nothing saved yet' : `${fidgets.length} saved`}
              onPress={() => go('/my-widgets')}
            />
          </View>

          <Text style={styles.section}>Explore</Text>
          <BuildRow icon={<Zap size={20} color="#F87171" />} title="Haptics Lab" subtitle="Feel and design vibrations" onPress={() => go('/haptics')} />
        </Entrance>
      </ScrollView>

      {toast && (
        <View pointerEvents="none" style={[styles.toast, { bottom: insets.bottom + 24 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    paddingHorizontal: SIDE,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandMark: {
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
  gear: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  tile: {
    height: TILE_HEIGHT,
    borderRadius: 22,
    padding: 16,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'space-between',
  },
  tileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tileText: {
    gap: 2,
    height: 56,
  },
  tileTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.3,
  },
  tileLine: {
    fontSize: 12.5,
    color: theme.textSecondary,
    lineHeight: 16,
  },
  emptyFavorites: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.borderLight,
  },
  emptyText: {
    fontSize: 14,
    color: theme.textMuted,
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
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
});
