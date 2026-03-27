import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';

interface HapticItem {
  id: string;
  label: string;
  subtitle: string;
  category: string;
  color: string;
  symbol: string;
  onTrigger: () => void;
}

const CATEGORIES = [
  { key: 'impact', label: 'Impact Feedback', description: 'Physical impacts — taps, collisions, UI weight' },
  { key: 'notification', label: 'Notification Feedback', description: 'Task outcomes — success, warning, error' },
  { key: 'selection', label: 'Selection Feedback', description: 'Scrolling through discrete values' },
];

function HapticCard({ item }: { item: HapticItem }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    item.onTrigger();
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, friction: 8, tension: 200 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 100 }),
    ]).start();
  }, [item, scaleAnim]);

  return (
    <Animated.View style={[styles.cardOuter, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8} testID={`haptic-${item.id}`}>
        <View style={[styles.iconBubble, { backgroundColor: item.color + '18' }]}>
          <Text style={[styles.symbolText, { color: item.color }]}>{item.symbol}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardLabel}>{item.label}</Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HapticsExplorer() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const hapticItems: HapticItem[] = [
    {
      id: 'impact-light', label: 'Light Impact', subtitle: 'Subtle tap — keyboard press',
      category: 'impact', symbol: '○', color: '#7DD3C0',
      onTrigger: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
    },
    {
      id: 'impact-medium', label: 'Medium Impact', subtitle: 'Standard tap — button press',
      category: 'impact', symbol: '◎', color: '#4ECDC4',
      onTrigger: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); },
    },
    {
      id: 'impact-heavy', label: 'Heavy Impact', subtitle: 'Strong thud — significant action',
      category: 'impact', symbol: '⬡', color: '#2B9E96',
      onTrigger: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); },
    },
    {
      id: 'impact-soft', label: 'Soft Impact', subtitle: 'Cushioned feel — elastic bounce',
      category: 'impact', symbol: '◇', color: '#F7B267',
      onTrigger: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {}); },
    },
    {
      id: 'impact-rigid', label: 'Rigid Impact', subtitle: 'Sharp, crisp tap — like glass',
      category: 'impact', symbol: '◆', color: '#E8575A',
      onTrigger: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {}); },
    },
    {
      id: 'notification-success', label: 'Success', subtitle: 'Task completed — payment confirmed',
      category: 'notification', symbol: '✓', color: '#4ADE80',
      onTrigger: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
    },
    {
      id: 'notification-warning', label: 'Warning', subtitle: 'Caution needed — approaching limit',
      category: 'notification', symbol: '⚠', color: '#FBBF24',
      onTrigger: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
    },
    {
      id: 'notification-error', label: 'Error', subtitle: 'Something failed — invalid input',
      category: 'notification', symbol: '✕', color: '#F87171',
      onTrigger: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); },
    },
    {
      id: 'selection', label: 'Selection Change', subtitle: 'Picker tick — scrolling a wheel',
      category: 'selection', symbol: '⫶', color: '#A78BFA',
      onTrigger: () => { Haptics.selectionAsync().catch(() => {}); },
    },
  ];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7} testID="haptics-back">
          <ChevronLeft size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Haptics Lab</Text>
          <Text style={styles.headerSub}>Tap to feel each vibration</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBanner}>
          <Zap size={16} color={theme.accent} />
          <Text style={styles.infoText}>
            Best experienced on a physical iPhone. Web & simulator have limited support.
          </Text>
        </View>

        {CATEGORIES.map((cat) => {
          const items = hapticItems.filter((h) => h.category === cat.key);
          return (
            <View key={cat.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{cat.label}</Text>
                <Text style={styles.sectionDesc}>{cat.description}</Text>
              </View>
              <View style={styles.cardList}>
                {items.map((item) => (
                  <HapticCard key={item.id} item={item} />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: theme.bg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: theme.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.accentGlow, borderRadius: 12, padding: 12, marginBottom: 24,
    borderWidth: 1, borderColor: theme.accentDim,
  },
  infoText: { flex: 1, fontSize: 13, color: theme.accent, lineHeight: 18 },
  section: { marginBottom: 28 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: theme.text, letterSpacing: -0.3 },
  sectionDesc: { fontSize: 12, color: theme.textMuted, marginTop: 3 },
  cardList: { gap: 10 },
  cardOuter: { borderRadius: 16, borderWidth: 1, borderColor: theme.widgetBorder },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  iconBubble: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  symbolText: { fontSize: 22, fontWeight: '600' as const },
  cardContent: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '600' as const, color: theme.text },
  cardSubtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 2, lineHeight: 16 },
});
