import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  LayoutChangeEvent,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Save, Trash2, Check, Heart, Pencil, Undo2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { useSavedFidgets } from '@/contexts/SavedFidgetContext';
import { LineThickness, DrawPoint, HapticPower } from '@/types/fidget';
import WidgetWrapper from '@/components/widgets/WidgetWrapper';
import WidgetPicker from '@/components/WidgetPicker';
import DrawingCanvas from '@/components/DrawingCanvas';
import { useFidget } from '@/contexts/FidgetContext';

export default function CreateFidgetPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createFidget } = useSavedFidgets();
  const { widgets, editMode, toggleEditMode, clearAllWidgets, undoLastChange, canUndo, clearUndo, addDrawnLine } = useFidget();
  const [name, setName] = useState('');
  const [favorited, setFavorited] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [showNameInput, setShowNameInput] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingThickness, setDrawingThickness] = useState<LineThickness>(2);
  const [drawingHapticPower, setDrawingHapticPower] = useState<HapticPower>('medium');
  const mountedRef = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      clearAllWidgets();
      clearUndo();
      if (!editMode) {
        toggleEditMode();
      }
    }
    return () => {
      clearUndo();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCanvasLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ width, height });
  }, []);

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
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearAllWidgets(),
        },
      ]
    );
  }, [clearAllWidgets]);

  const handleSavePrompt = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (widgets.length === 0) {
      Alert.alert('No Widgets', 'Add at least one widget before saving.');
      return;
    }
    setShowNameInput(true);
  }, [widgets]);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please give your fidget board a name.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const saved = createFidget(trimmedName, widgets);
    if (favorited) {
      // Will be set during creation
    }
    if (editMode) {
      toggleEditMode();
    }
    clearAllWidgets();
    router.replace(`/fidget/${saved.id}` as any);
  }, [name, widgets, favorited, createFidget, editMode, toggleEditMode, clearAllWidgets, router]);

  const handleToggleFavorite = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFavorited(prev => !prev);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (widgets.length > 0) {
              Alert.alert(
                'Unsaved Changes',
                'You have widgets on the board. Would you like to save before leaving?',
                [
                  {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => {
                      if (editMode) toggleEditMode();
                      clearAllWidgets();
                      clearUndo();
                      router.back();
                    },
                  },
                  {
                    text: 'Save',
                    onPress: () => {
                      handleSavePrompt();
                    },
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            } else {
              if (editMode) toggleEditMode();
              clearAllWidgets();
              clearUndo();
              router.back();
            }
          }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerBtnDanger}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color="#F87171" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.undoBtn, !canUndo && styles.undoBtnDisabled]}
            onPress={() => {
              if (!canUndo) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              undoLastChange();
            }}
            activeOpacity={0.7}
            disabled={!canUndo}
          >
            <Undo2 size={16} color={canUndo ? theme.textSecondary : theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddWidget}
            activeOpacity={0.7}
          >
            <Plus size={18} color={theme.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.checkBtn, editMode && styles.checkBtnActive]}
            onPress={toggleEditMode}
            activeOpacity={0.7}
          >
            {editMode ? (
              <Check size={16} color="#34D399" />
            ) : (
              <Pencil size={14} color={theme.textMuted} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveHeaderBtn, widgets.length === 0 && styles.saveHeaderBtnDisabled]}
            onPress={handleSavePrompt}
            activeOpacity={0.7}
            disabled={widgets.length === 0}
          >
            <Save size={16} color={widgets.length === 0 ? theme.textMuted : theme.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.canvas} onLayout={handleCanvasLayout}>
        {widgets.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Start building</Text>
            <Text style={styles.emptySub}>Tap + to add widgets to your board</Text>
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

      {showNameInput && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.namePanel, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.nameRow}>
              <TextInput
                style={styles.nameInput}
                placeholder="Name your fidget..."
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <TouchableOpacity
                style={[styles.favBtn, favorited && styles.favBtnActive]}
                onPress={handleToggleFavorite}
                activeOpacity={0.7}
              >
                <Heart
                  size={18}
                  color={favorited ? '#F87171' : theme.textMuted}
                  fill={favorited ? '#F87171' : 'transparent'}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.nameActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowNameInput(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmSaveBtn}
                onPress={handleSave}
                activeOpacity={0.7}
              >
                <Check size={18} color={theme.bg} />
                <Text style={styles.confirmSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      <WidgetPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onStartDrawing={handleStartDrawing}
      />

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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtnDanger: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(78, 205, 196, 0.12)',
    borderWidth: 1,
    borderColor: theme.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoBtnDisabled: {
    opacity: 0.4,
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
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  saveHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(78, 205, 196, 0.12)',
    borderWidth: 1,
    borderColor: theme.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveHeaderBtnDisabled: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    opacity: 0.5,
  },
  namePanel: {
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  nameInput: {
    flex: 1,
    height: 48,
    backgroundColor: theme.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  favBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnActive: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  nameActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.textSecondary,
  },
  confirmSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.accent,
  },
  confirmSaveText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.bg,
  },
});
