import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { X, Volume2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { useFidget } from '@/contexts/FidgetContext';
import { WIDGET_TYPES } from '@/constants/widgets';
import { WidgetType, HapticPower, LineThickness } from '@/types/fidget';

interface WidgetPickerProps {
  visible: boolean;
  onClose: () => void;
  onStartDrawing?: (thickness: LineThickness) => void;
}

const WIDGET_SYMBOLS: Record<string, string> = {
  Circle: '○',
  RotateCw: '↻',
  GripHorizontal: '≡',
  Move: '✥',
  Minus: '━',
};

const LINE_THICKNESS_OPTIONS: { value: LineThickness; label: string }[] = [
  { value: 0.5, label: 'Hairline' },
  { value: 1, label: 'Thin' },
  { value: 1.5, label: 'Light' },
  { value: 2, label: 'Regular' },
  { value: 3, label: 'Medium' },
  { value: 5, label: 'Bold' },
  { value: 8, label: 'Heavy' },
];

const HAPTIC_OPTIONS: { value: HapticPower; label: string; symbol: string; color: string; category: string }[] = [
  { value: 'light', label: 'Light', symbol: '○', color: '#7DD3C0', category: 'Impact' },
  { value: 'medium', label: 'Medium', symbol: '◎', color: '#4ECDC4', category: 'Impact' },
  { value: 'heavy', label: 'Heavy', symbol: '⬡', color: '#2B9E96', category: 'Impact' },
  { value: 'soft', label: 'Soft', symbol: '◇', color: '#F7B267', category: 'Impact' },
  { value: 'rigid', label: 'Rigid', symbol: '◆', color: '#E8575A', category: 'Impact' },
  { value: 'success', label: 'Success', symbol: '✓', color: '#4ADE80', category: 'Notification' },
  { value: 'warning', label: 'Warning', symbol: '⚠', color: '#FBBF24', category: 'Notification' },
  { value: 'error', label: 'Error', symbol: '✕', color: '#F87171', category: 'Notification' },
  { value: 'selection', label: 'Selection', symbol: '⫶', color: '#A78BFA', category: 'Selection' },
];

function triggerHapticForPower(power: HapticPower) {
  switch (power) {
    case 'light': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); break;
    case 'medium': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); break;
    case 'heavy': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); break;
    case 'soft': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {}); break;
    case 'rigid': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {}); break;
    case 'success': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); break;
    case 'warning': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); break;
    case 'error': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); break;
    case 'selection': Haptics.selectionAsync().catch(() => {}); break;
  }
}

export default function WidgetPicker({ visible, onClose, onStartDrawing }: WidgetPickerProps) {
  const { addWidget } = useFidget();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [selectedPower, setSelectedPower] = useState<HapticPower>('medium');
  const [showPowerPicker, setShowPowerPicker] = useState(false);
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null);
  const [showLinePicker, setShowLinePicker] = useState(false);
  const [selectedThickness, setSelectedThickness] = useState<LineThickness>(2);


  useEffect(() => {
    if (visible) {
      setShowPowerPicker(false);
      setShowLinePicker(false);
      setSelectedPower('medium');
      setSelectedType(null);
      setSelectedThickness(2);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 9,
          tension: 65,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleAdd = useCallback((type: WidgetType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectedType(type);
    if (type === 'line') {
      setShowLinePicker(true);
    } else {
      setShowPowerPicker(true);
    }
  }, []);

  const handleConfirmAdd = useCallback(() => {
    if (!selectedType) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    addWidget(selectedType, { hapticPower: selectedPower });
    onClose();
  }, [selectedType, selectedPower, addWidget, onClose]);

  const handleLineConfirm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (onStartDrawing) {
      onStartDrawing(selectedThickness);
    }
    onClose();
  }, [selectedThickness, onStartDrawing, onClose]);

  const handlePowerSelect = useCallback((power: HapticPower) => {
    setSelectedPower(power);
    triggerHapticForPower(power);
  }, []);

  const handleTestHaptic = useCallback(() => {
    triggerHapticForPower(selectedPower);
  }, [selectedPower]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
      >
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.handleBar} />
        <View style={styles.header}>
          <Text style={styles.title}>
            {showPowerPicker ? 'Haptic Feedback' : showLinePicker ? 'Line Options' : 'Add Widget'}
          </Text>
          <TouchableOpacity onPress={() => {
            if (showPowerPicker) {
              if (selectedType === 'line') {
                setShowPowerPicker(false);
                setShowLinePicker(true);
              } else {
                setShowPowerPicker(false);
                setSelectedType(null);
              }
            } else if (showLinePicker) {
              setShowLinePicker(false);
              setSelectedType(null);
            } else {
              onClose();
            }
          }} style={styles.closeButton}>
            <X size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {showLinePicker ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.powerSection}
          >
            <Text style={styles.powerHint}>Choose line thickness, then draw on the canvas</Text>
            <View style={styles.thicknessGrid}>
              {LINE_THICKNESS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.thicknessChip,
                    selectedThickness === opt.value && styles.thicknessChipActive,
                  ]}
                  onPress={() => {
                    setSelectedThickness(opt.value);
                    Haptics.selectionAsync().catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.thicknessPreview, { height: Math.max(opt.value, 1), borderRadius: opt.value / 2 }]} />
                  <Text style={[
                    styles.thicknessLabel,
                    selectedThickness === opt.value && styles.thicknessLabelActive,
                  ]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleLineConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>Draw Line</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : !showPowerPicker ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {WIDGET_TYPES.map((info) => (
              <TouchableOpacity
                key={info.type}
                style={styles.widgetCard}
                onPress={() => handleAdd(info.type)}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <Text style={styles.widgetSymbol}>{WIDGET_SYMBOLS[info.icon] ?? '●'}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{info.label}</Text>
                  <Text style={styles.cardDesc}>{info.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.powerSection}
          >
            <Text style={styles.powerHint}>
              Choose how the haptic feedback feels
            </Text>
            <View style={styles.hapticGrid}>
              {HAPTIC_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.hapticChip,
                    selectedPower === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '18' },
                  ]}
                  onPress={() => handlePowerSelect(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.hapticSymbol,
                    { color: selectedPower === opt.value ? opt.color : theme.textMuted },
                  ]}>{opt.symbol}</Text>
                  <Text style={[
                    styles.hapticLabel,
                    selectedPower === opt.value && { color: opt.color },
                  ]}>{opt.label}</Text>
                  <Text style={[
                    styles.hapticCategory,
                    selectedPower === opt.value && { color: opt.color, opacity: 0.7 },
                  ]}>{opt.category}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.testButton}
                onPress={handleTestHaptic}
                activeOpacity={0.7}
              >
                <Volume2 size={16} color={theme.accent} />
                <Text style={styles.testText}>Test</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmAdd}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmText}>Add Widget</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.overlay,
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: 520,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.textMuted,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.text,
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    gap: 12,
    paddingBottom: 10,
  },
  widgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.widgetBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.widgetBorder,
    gap: 14,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: theme.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetSymbol: {
    fontSize: 26,
    color: theme.accent,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.text,
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  powerSection: {
    paddingBottom: 10,
  },
  powerHint: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  hapticGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  hapticChip: {
    width: '31%' as any,
    flexGrow: 1,
    flexBasis: '29%' as any,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: theme.widgetBg,
    borderWidth: 1.5,
    borderColor: theme.widgetBorder,
    alignItems: 'center',
    gap: 4,
  },
  hapticSymbol: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.textMuted,
  },
  hapticLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.textSecondary,
  },
  hapticCategory: {
    fontSize: 10,
    color: theme.textMuted,
    opacity: 0.6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.25)',
  },
  testText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.accent,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.bg,
  },
  thicknessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  thicknessChip: {
    width: '31%' as any,
    flexGrow: 1,
    flexBasis: '29%' as any,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: theme.widgetBg,
    borderWidth: 1.5,
    borderColor: theme.widgetBorder,
    alignItems: 'center',
    gap: 6,
  },
  thicknessChipActive: {
    borderColor: theme.accent,
    backgroundColor: theme.accentGlow,
  },
  thicknessPreview: {
    width: '80%',
    backgroundColor: theme.textSecondary,
  },
  thicknessLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: theme.textSecondary,
  },
  thicknessLabelActive: {
    color: theme.accent,
  },

});
