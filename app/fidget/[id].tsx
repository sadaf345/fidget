import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  LayoutChangeEvent,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Heart, Settings, Check, Plus, Trash2, Pencil, Undo2 } from 'lucide-react-native';
import { LineThickness, DrawPoint, HapticPower, SavedFidget, WidgetConfig } from '@/types/fidget';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { useSavedFidgets } from '@/contexts/SavedFidgetContext';
import { FidgetProvider, useFidget } from '@/contexts/FidgetContext';
import WidgetWrapper from '@/components/widgets/WidgetWrapper';
import WidgetPicker from '@/components/WidgetPicker';
import DrawingCanvas from '@/components/DrawingCanvas';

export default function FidgetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getFidgetById, updateFidget, isLoading } = useSavedFidgets();
  const fidget = getFidgetById(id ?? '');
  const fidgetId = fidget?.id;

  // Every change autosaves, so leaving the screen or closing the app never loses a layout.
  const handleBoardChange = useCallback((widgets: WidgetConfig[]) => {
    if (fidgetId) updateFidget(fidgetId, { widgets });
  }, [fidgetId, updateFidget]);

  if (isLoading) {
    return (
      <View style={[styles.root, styles.notFound]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!fidget) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Fidget not found</Text>
        </View>
      </View>
    );
  }

  return (
    <FidgetProvider key={fidget.id} initialWidgets={fidget.widgets} onChange={handleBoardChange}>
      <FidgetEditorPage fidget={fidget} />
    </FidgetProvider>
  );
}

function FidgetEditorPage({ fidget }: { fidget: SavedFidget }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { updateFidget, toggleFavorite } = useSavedFidgets();
  const { widgets, editMode, toggleEditMode, clearAllWidgets, addDrawnLine, undoLastChange, canUndo } = useFidget();

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(fidget.name);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingThickness, setDrawingThickness] = useState<LineThickness>(2);
  const [drawingHapticPower, setDrawingHapticPower] = useState<HapticPower>('medium');

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

  const handleStartDrawing = useCallback((thickness: LineThickness, hapticPower: HapticPower) => {
    setDrawingThickness(thickness);
    setDrawingHapticPower(hapticPower);
    setDrawingMode(true);
  }, []);

  const handleDrawingComplete = useCallback((points: DrawPoint[], width: number, height: number, centerX: number, centerY: number) => {
    addDrawnLine(points, width, height, centerX, centerY, drawingThickness, drawingHapticPower);
    setDrawingMode(false);
  }, [addDrawnLine, drawingThickness, drawingHapticPower]);

  const handleDrawingCancel = useCallback(() => {
    setDrawingMode(false);
  }, []);

  const handleClearAll = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Alert.alert(
      'Clear All Widgets',
      'Are you sure you want to wipe the board clean?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => clearAllWidgets() },
      ]
    );
  }, [clearAllWidgets]);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    undoLastChange();
  }, [canUndo, undoLastChange]);

  const handleToggleFavorite = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    toggleFavorite(fidget.id);
  }, [fidget, toggleFavorite]);

  const handleSaveName = useCallback(() => {
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert('Name Required', 'Please enter a name for your fidget.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    updateFidget(fidget.id, { name: trimmed });
    setIsEditing(false);
  }, [fidget, editName, updateFidget]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ChevronLeft size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {isEditing ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.editNameInput}
                value={editName}
                onChangeText={setEditName}
                autoFocus
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <TouchableOpacity style={styles.saveNameBtn} onPress={handleSaveName} activeOpacity={0.7}>
                <Check size={16} color={theme.accent} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.nameWrap}
              onPress={() => {
                setEditName(fidget.name);
                setIsEditing(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.fidgetName} numberOfLines={1}>{fidget.name}</Text>
              <Pencil size={12} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.favHeaderBtn, fidget.favorited && styles.favHeaderBtnActive]}
            onPress={handleToggleFavorite}
            activeOpacity={0.7}
          >
            <Heart
              size={16}
              color={fidget.favorited ? '#F87171' : theme.textMuted}
              fill={fidget.favorited ? '#F87171' : 'transparent'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {editMode && (
        <View style={styles.editToolbar}>
          <TouchableOpacity style={styles.toolBtn} onPress={handleClearAll} activeOpacity={0.7}>
            <Trash2 size={16} color="#F87171" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtnNeutral, !canUndo && styles.toolBtnDisabled]}
            onPress={handleUndo}
            activeOpacity={0.7}
            disabled={!canUndo}
          >
            <Undo2 size={16} color={canUndo ? theme.textSecondary : theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtnAccent} onPress={handleAddWidget} activeOpacity={0.7}>
            <Plus size={16} color={theme.accent} />
            <Text style={styles.toolBtnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtnSave} onPress={handleEditToggle} activeOpacity={0.7}>
            <Check size={16} color={theme.bg} />
            <Text style={styles.toolBtnSaveText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.canvas} onLayout={handleCanvasLayout}>
        {widgets.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Empty board</Text>
            <Text style={styles.emptySub}>
              {editMode ? 'Tap + Add to add widgets' : 'Enter edit mode to add widgets'}
            </Text>
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

        {drawingMode && canvasSize.width > 0 && (
          <DrawingCanvas
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            lineThickness={drawingThickness}
            onComplete={handleDrawingComplete}
            onCancel={handleDrawingCancel}
          />
        )}
      </View>

      {!editMode && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={styles.editModeBtn} onPress={handleEditToggle} activeOpacity={0.7}>
            <Settings size={18} color={theme.accent} />
            <Text style={styles.editModeText}>Edit Board</Text>
          </TouchableOpacity>
        </View>
      )}

      {editMode && (
        <View style={[styles.editBanner, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.editDot} />
          <Text style={styles.editBannerText}>Edit Mode — Drag to reposition</Text>
        </View>
      )}

      <WidgetPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onStartDrawing={handleStartDrawing}
      />
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
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
  headerCenter: {
    flex: 1,
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fidgetName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.text,
    letterSpacing: -0.5,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editNameInput: {
    flex: 1,
    height: 36,
    backgroundColor: theme.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  saveNameBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.accentGlow,
    borderWidth: 1,
    borderColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  favHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favHeaderBtnActive: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  editToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  toolBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnNeutral: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnDisabled: {
    opacity: 0.4,
  },
  toolBtnAccent: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(78, 205, 196, 0.12)',
    borderWidth: 1,
    borderColor: theme.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  toolBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.accent,
  },
  toolBtnSave: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderRadius: 11,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  toolBtnSaveText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: theme.bg,
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
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  editModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.25)',
  },
  editModeText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.accent,
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
  editBannerText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.accent,
    letterSpacing: 0.3,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 18,
    color: theme.textSecondary,
  },
});
