import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { X, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { useFidget } from '@/contexts/FidgetContext';
import { WIDGET_TYPES } from '@/constants/widgets';
import { WidgetType, HapticPower } from '@/types/fidget';

interface WidgetPickerProps {
  visible: boolean;
  onClose: () => void;
  onOpenHapticsLab?: () => void;
}

const WIDGET_SYMBOLS: Record<string, string> = {
  Circle: '○',
  RotateCw: '↻',
  GripHorizontal: '≡',
  Move: '✥',
};

const POWER_OPTIONS: { value: HapticPower; label: string; emoji: string }[] = [
  { value: 'light', label: 'Light', emoji: '·' },
  { value: 'medium', label: 'Medium', emoji: '••' },
  { value: 'heavy', label: 'Heavy', emoji: '•••' },
];

export default function WidgetPicker({ visible, onClose, onOpenHapticsLab }: WidgetPickerProps) {
  const { addWidget } = useFidget();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [selectedPower, setSelectedPower] = useState<HapticPower>('medium');
  const [showPowerPicker, setShowPowerPicker] = useState(false);
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null);

  useEffect(() => {
    if (visible) {
      setShowPowerPicker(false);
      setSelectedPower('medium');
      setSelectedType(null);
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

  const handleAdd = (type: WidgetType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectedType(type);
    setShowPowerPicker(true);
  };

  const handleConfirmAdd = () => {
    if (!selectedType) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    addWidget(selectedType, { hapticPower: selectedPower });
    onClose();
  };

  const handlePowerSelect = (power: HapticPower) => {
    setSelectedPower(power);
    if (power === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else if (power === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
  };

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
            {showPowerPicker ? 'Haptic Feedback' : 'Add Widget'}
          </Text>
          <TouchableOpacity onPress={() => {
            if (showPowerPicker) {
              setShowPowerPicker(false);
              setSelectedType(null);
            } else {
              onClose();
            }
          }} style={styles.closeButton}>
            <X size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {!showPowerPicker ? (
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
          <View style={styles.powerSection}>
            <Text style={styles.powerHint}>
              Choose how strong the haptic feedback feels
            </Text>
            <View style={styles.powerOptions}>
              {POWER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.powerOption,
                    selectedPower === opt.value && styles.powerOptionActive,
                  ]}
                  onPress={() => handlePowerSelect(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.powerEmoji,
                    selectedPower === opt.value && styles.powerEmojiActive,
                  ]}>{opt.emoji}</Text>
                  <Text style={[
                    styles.powerLabel,
                    selectedPower === opt.value && styles.powerLabelActive,
                  ]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmAdd}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>Add Widget</Text>
            </TouchableOpacity>
            {onOpenHapticsLab && (
              <TouchableOpacity
                style={styles.hapticsLabBtn}
                onPress={() => {
                  onClose();
                  onOpenHapticsLab();
                }}
                activeOpacity={0.7}
              >
                <Zap size={16} color="#F87171" />
                <Text style={styles.hapticsLabText}>Try in Haptics Lab</Text>
              </TouchableOpacity>
            )}
          </View>
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
    maxHeight: 480,
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
    marginBottom: 20,
    lineHeight: 20,
  },
  powerOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  powerOption: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: theme.widgetBg,
    borderWidth: 1.5,
    borderColor: theme.widgetBorder,
    alignItems: 'center',
    gap: 6,
  },
  powerOptionActive: {
    borderColor: theme.accent,
    backgroundColor: theme.accentGlow,
  },
  powerEmoji: {
    fontSize: 20,
    color: theme.textMuted,
    fontWeight: '900' as const,
  },
  powerEmojiActive: {
    color: theme.accent,
  },
  powerLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.textSecondary,
  },
  powerLabelActive: {
    color: theme.accent,
  },
  confirmButton: {
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
  hapticsLabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
  },
  hapticsLabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#F87171',
  },
});
