import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  LayoutChangeEvent,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Settings, RotateCcw, Check, ChevronLeft, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { useFidget } from '@/contexts/FidgetContext';
import WidgetWrapper from '@/components/widgets/WidgetWrapper';
import WidgetPicker from '@/components/WidgetPicker';

function BackgroundOrbs() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.orb, styles.orb1, { opacity: 0.08 }]} />
      <View style={[styles.orb, styles.orb2, { opacity: 0.06 }]} />
      <View style={[styles.orb, styles.orb3, { opacity: 0.07 }]} />
    </View>
  );
}

const GridPattern = React.memo(function GridPattern() {
  return (
    <View style={styles.gridContainer} pointerEvents="none">
      {Array.from({ length: 5 }).map((_, row) => (
        <View key={`row-${row}`} style={styles.gridRow}>
          {Array.from({ length: 4 }).map((_, col) => (
            <View key={`dot-${row}-${col}`} style={styles.gridDot} />
          ))}
        </View>
      ))}
    </View>
  );
});

export default function PlaygroundCanvas() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { widgets, editMode, isLoading, toggleEditMode, resetWidgets, clearAllWidgets } = useFidget();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const handleCanvasLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ width, height });
  }, []);

  const handleEditToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    toggleEditMode();
  }, [toggleEditMode]);

  const handleAddWidget = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPickerVisible(true);
  }, []);

  const handleReset = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    resetWidgets();
  }, [resetWidgets]);

  const handleClearAll = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    clearAllWidgets();
  }, [clearAllWidgets]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <BackgroundOrbs />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.logo}>playground</Text>
        </View>
        <View style={styles.headerActions}>
          {editMode && (
            <>
              <TouchableOpacity
                style={styles.headerBtnDanger}
                onPress={handleClearAll}
                activeOpacity={0.7}
                testID="clear-all-btn"
              >
                <Trash2 size={16} color="#F87171" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={handleReset}
                activeOpacity={0.7}
              >
                <RotateCcw size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerBtnAccent}
                onPress={handleAddWidget}
                activeOpacity={0.7}
              >
                <Plus size={18} color={theme.accent} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.headerBtn, editMode && styles.headerBtnActive]}
            onPress={handleEditToggle}
            activeOpacity={0.7}
          >
            {editMode ? (
              <Check size={18} color={theme.accent} />
            ) : (
              <Settings size={18} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.canvas} onLayout={handleCanvasLayout}>
        {widgets.length === 0 && (
          <View style={styles.emptyState}>
            <GridPattern />
            <View style={styles.emptyContent}>
              <Text style={styles.emptyTitle}>
                {editMode ? 'No widgets yet' : 'Your fidget space'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {editMode
                  ? 'Tap + to add your first fidget widget'
                  : 'Tap the gear icon to enter edit mode\nand customize your widgets'}
              </Text>
              {!editMode && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={handleEditToggle}
                  activeOpacity={0.7}
                >
                  <Settings size={16} color={theme.accent} />
                  <Text style={styles.emptyButtonText}>Get Started</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {canvasSize.width > 0 && widgets.map((widget) => (
          <WidgetWrapper
            key={widget.id}
            widget={widget}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
          />
        ))}
      </View>

      {editMode && (
        <View style={[styles.editBanner, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.editDot} />
          <Text style={styles.editText}>Edit Mode — Drag to reposition</Text>
        </View>
      )}

      <WidgetPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const { width: SCREEN_W } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 260,
    height: 260,
    backgroundColor: theme.accent,
    top: '10%',
    left: -60,
  },
  orb2: {
    width: 200,
    height: 200,
    backgroundColor: '#6366F1',
    top: '45%',
    right: -40,
  },
  orb3: {
    width: 180,
    height: 180,
    backgroundColor: '#F59E0B',
    bottom: '10%',
    left: '30%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.text,
    letterSpacing: -0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(22, 22, 31, 0.85)',
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnAccent: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(78, 205, 196, 0.12)',
    borderWidth: 1,
    borderColor: theme.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnActive: {
    backgroundColor: theme.accentGlow,
    borderColor: theme.accent,
  },
  headerBtnDanger: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: theme.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.25)',
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.accent,
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  gridRow: {
    flexDirection: 'row',
    gap: SCREEN_W / 7,
  },
  gridDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.textMuted,
    opacity: 0.25,
  },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    gap: 8,
  },
  editDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.accent,
  },
  editText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.accent,
    letterSpacing: 0.3,
  },
});
