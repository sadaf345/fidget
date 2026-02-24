import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Heart, Clock, Trash2, ChevronRight, Layers, SlidersHorizontal } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { useSavedFidgets } from '@/contexts/SavedFidgetContext';
import { SavedFidget } from '@/types/fidget';

type SortMode = 'date' | 'favorites' | 'both';

function EmptyState() {
  const router = useRouter();
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Layers size={40} color={theme.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>No saved widgets yet</Text>
      <Text style={styles.emptySub}>Create your first fidget board to see it here</Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          router.push('/create' as any);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.emptyBtnText}>Create Fidget</Text>
      </TouchableOpacity>
    </View>
  );
}

function FidgetCard({ fidget, index }: { fidget: SavedFidget; index: number }) {
  const router = useRouter();
  const { toggleFavorite, deleteFidget } = useSavedFidgets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/fidget/${fidget.id}` as any);
  }, [fidget.id, router]);

  const handleFavorite = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    toggleFavorite(fidget.id);
  }, [fidget.id, toggleFavorite]);

  const handleDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Alert.alert(
      'Delete Fidget',
      `Are you sure you want to delete "${fidget.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteFidget(fidget.id),
        },
      ]
    );
  }, [fidget.id, fidget.name, deleteFidget]);

  const date = new Date(fidget.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const widgetCount = fidget.widgets.length;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        style={styles.fidgetCard}
        onPress={handlePress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start()}
        activeOpacity={1}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardName} numberOfLines={1}>{fidget.name}</Text>
            {fidget.favorited && (
              <Heart size={14} color="#F87171" fill="#F87171" />
            )}
          </View>
          <ChevronRight size={18} color={theme.textMuted} />
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <Layers size={12} color={theme.textSecondary} />
            <Text style={styles.metaText}>{widgetCount} widget{widgetCount !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.metaChip}>
            <Clock size={12} color={theme.textSecondary} />
            <Text style={styles.metaText}>{dateStr}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, fidget.favorited && styles.actionBtnFav]}
            onPress={handleFavorite}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Heart
              size={16}
              color={fidget.favorited ? '#F87171' : theme.textMuted}
              fill={fidget.favorited ? '#F87171' : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnDanger}
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function MyWidgetsPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fidgets, isLoading } = useSavedFidgets();
  const [sortMode, setSortMode] = useState<SortMode>('date');

  const handleSort = useCallback((mode: SortMode) => {
    Haptics.selectionAsync().catch(() => {});
    setSortMode(mode);
  }, []);

  const sortedFidgets = React.useMemo(() => {
    let list = [...fidgets];
    if (sortMode === 'favorites') {
      list = list.filter(f => f.favorited);
      list.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortMode === 'both') {
      list.sort((a, b) => {
        if (a.favorited && !b.favorited) return -1;
        if (!a.favorited && b.favorited) return 1;
        return b.createdAt - a.createdAt;
      });
    } else {
      list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [fidgets, sortMode]);

  const sortLabel = sortMode === 'date' ? 'Newest' : sortMode === 'favorites' ? 'Favorites' : 'Fav + Date';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Widgets</Text>
          <Text style={styles.headerCount}>{fidgets.length} saved</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.sortBar}>
        <TouchableOpacity
          style={[styles.sortChip, sortMode === 'date' && styles.sortChipActive]}
          onPress={() => handleSort('date')}
          activeOpacity={0.7}
        >
          <Clock size={13} color={sortMode === 'date' ? theme.bg : theme.textMuted} />
          <Text style={[styles.sortChipText, sortMode === 'date' && styles.sortChipTextActive]}>Newest</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortChip, sortMode === 'favorites' && styles.sortChipActive]}
          onPress={() => handleSort('favorites')}
          activeOpacity={0.7}
        >
          <Heart size={13} color={sortMode === 'favorites' ? theme.bg : theme.textMuted} />
          <Text style={[styles.sortChipText, sortMode === 'favorites' && styles.sortChipTextActive]}>Favorites</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortChip, sortMode === 'both' && styles.sortChipActive]}
          onPress={() => handleSort('both')}
          activeOpacity={0.7}
        >
          <SlidersHorizontal size={13} color={sortMode === 'both' ? theme.bg : theme.textMuted} />
          <Text style={[styles.sortChipText, sortMode === 'both' && styles.sortChipTextActive]}>Fav + Date</Text>
        </TouchableOpacity>
      </View>

      {fidgets.length === 0 && !isLoading ? (
        <EmptyState />
      ) : sortedFidgets.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Heart size={40} color={theme.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySub}>Tap the heart icon on a widget to favorite it</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {sortedFidgets.map((fidget, index) => (
            <FidgetCard key={fidget.id} fidget={fidget} index={index} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.text,
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 2,
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  sortChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sortChipActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.textMuted,
  },
  sortChipTextActive: {
    color: theme.bg,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.text,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.accent,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.bg,
  },
  fidgetCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: theme.text,
    letterSpacing: -0.3,
    flex: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 12,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnFav: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  actionBtnDanger: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
