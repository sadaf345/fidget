import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { ChevronLeft, Settings2, Volume2, VolumeX, X } from 'lucide-react-native';
import { theme } from '@/constants/colors';
import { TOYS_BY_ID } from '@/constants/toys';
import { INTENSITY_MAX, INTENSITY_MIN, useSettings } from '@/contexts/SettingsContext';
import { playHaptic, transient } from '@/lib/haptics';
import { setActiveToy, stopAllHaptics } from '@/lib/hapticState';
import Slider from '@/components/ui/Slider';

interface ToyChromeProps {
  toyId: string;
  /** Small stat on the right, e.g. "128 picked". */
  stat?: string;
  /** Dark text for light backgrounds (Pick's lighter skin tones). */
  tone?: 'light' | 'dark';
  /** Keep the screen awake regardless of Discreet mode (Breathe and Heartbeat while running). */
  keepAwake?: boolean;
  /** The toy's own controls, shown in its settings sheet. */
  options?: React.ReactNode;
}

const KEEP_AWAKE_TAG = 'toy';

/**
 * Everything around a toy: floating back button, title and settings gear; the settings sheet
 * (intensity, Discreet mode, the toy's own options, quick launch); the Discreet dimming layer.
 * While the toy is on screen its intensity applies, and every haptic stops when you leave.
 * Render it as the last child of the toy's root view.
 */
export default function ToyChrome({ toyId, stat, tone = 'light', keepAwake = false, options }: ToyChromeProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toy = TOYS_BY_ID[toyId];
  const { settings, setDiscreet, setSound } = useSettings();
  const [sheetOpen, setSheetOpen] = useState(false);
  const discreet = settings.discreet;

  useFocusEffect(useCallback(() => {
    setActiveToy(toyId);
    return () => {
      setActiveToy(null);
      stopAllHaptics();
    };
  }, [toyId]));

  // Discreet mode keeps the phone from locking while a toy is open; so do running calm toys.
  const awake = discreet || keepAwake;
  useEffect(() => {
    if (!awake) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [awake]);

  const fg = tone === 'light' ? theme.text : '#2A1E18';
  const pill = tone === 'light' ? 'rgba(22,22,31,0.72)' : 'rgba(255,255,255,0.55)';

  return (
    <>
      {discreet && <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.discreet]} />}

      <View pointerEvents="box-none" style={[styles.bar, { paddingTop: insets.top + 6 }, discreet && styles.barDim]}>
        <Pressable
          onPress={() => {
            playHaptic('light');
            router.back();
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.round, { backgroundColor: pill, opacity: pressed ? 0.6 : 1 }]}
        >
          <ChevronLeft size={20} color={fg} />
        </Pressable>
        <Text style={[styles.title, { color: fg }]} numberOfLines={1} maxFontSizeMultiplier={1.3} accessibilityRole="header">
          {toy?.title}
        </Text>
        <View style={styles.right} pointerEvents="box-none">
          {stat ? (
            <View style={[styles.statPill, { backgroundColor: pill }]} pointerEvents="none">
              <Text style={[styles.stat, { color: fg }]} maxFontSizeMultiplier={1.3}>{stat}</Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => {
              playHaptic('light');
              setSound(!settings.sound);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={settings.sound ? 'Mute all sounds' : 'Turn sounds on'}
            style={({ pressed }) => [styles.round, { backgroundColor: pill, opacity: pressed ? 0.6 : 1 }]}
          >
            {settings.sound ? <Volume2 size={18} color={fg} /> : <VolumeX size={18} color={fg} />}
          </Pressable>
          <Pressable
            onPress={() => {
              playHaptic('light');
              setSheetOpen(true);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`${toy?.title ?? 'Toy'} settings`}
            style={({ pressed }) => [styles.round, { backgroundColor: pill, opacity: pressed ? 0.6 : 1 }]}
          >
            <Settings2 size={18} color={fg} />
          </Pressable>
        </View>
      </View>

      {sheetOpen && (
        <ToySettingsSheet toyId={toyId} discreet={discreet} setDiscreet={setDiscreet} onClose={() => setSheetOpen(false)}>
          {options}
        </ToySettingsSheet>
      )}
    </>
  );
}

function ToySettingsSheet({ toyId, discreet, setDiscreet, onClose, children }: {
  toyId: string;
  discreet: boolean;
  setDiscreet: (on: boolean) => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const toy = TOYS_BY_ID[toyId];
  const { settings, setToyIntensity, patterns, setTapPattern, setToySoundMuted } = useSettings();
  const toyMuted = settings.toySoundMuted[toyId] ?? false;
  const intensity = settings.toyIntensity[toyId] ?? 1;
  const assigned = settings.tapPatterns[toyId] ?? null;
  const slide = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slide, { toValue: 1, useNativeDriver: true, friction: 9, tension: 70 }).start();
  }, [slide]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} accessibilityLabel="Close settings" />
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 16, transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }] },
        ]}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle} accessibilityRole="header">{toy?.title} settings</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
            <X size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
          <Slider
            label="Intensity for this toy"
            value={intensity}
            min={INTENSITY_MIN}
            max={INTENSITY_MAX}
            step={0.05}
            format={v => `${Math.round(v * 100)}%`}
            onChange={v => {
              setToyIntensity(toyId, v);
            }}
          />
          <Pressable onPress={() => transient(0.7, 0.6)} style={styles.tryButton} accessibilityRole="button">
            <Text style={styles.tryText}>Feel it</Text>
          </Pressable>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Discreet mode</Text>
              <Text style={styles.rowSub}>Dims the screen, mutes sound, keeps the phone awake.</Text>
            </View>
            <Switch
              value={discreet}
              onValueChange={on => {
                playHaptic('light');
                setDiscreet(on);
              }}
              trackColor={{ true: theme.accent, false: theme.border }}
              accessibilityLabel="Discreet mode"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Sound for this toy</Text>
              <Text style={styles.rowSub}>
                {settings.sound ? 'The speaker button up top mutes every toy.' : 'All sounds are off (the speaker button up top).'}
              </Text>
            </View>
            <Switch
              value={!toyMuted}
              onValueChange={on => {
                playHaptic('light');
                setToySoundMuted(toyId, !on);
              }}
              trackColor={{ true: theme.accent, false: theme.border }}
              accessibilityLabel="Sound for this toy"
            />
          </View>

          {children}

          {toy?.tapPattern && (
            <View style={styles.block}>
              <Text style={styles.rowTitle}>Tap feel</Text>
              <Text style={styles.rowSub}>{"Use a pattern you recorded in the Haptics Lab instead of this toy's own tap."}</Text>
              <View style={styles.chips}>
                {[{ id: null as string | null, name: 'Default' }, ...patterns.map(p => ({ id: p.id as string | null, name: p.name }))].map(p => {
                  const selected = p.id === assigned;
                  return (
                    <Pressable
                      key={p.id ?? 'default'}
                      onPress={() => {
                        playHaptic('selection', { raw: true });
                        setTapPattern(toyId, p.id);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{p.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {patterns.length === 0 && <Text style={styles.rowSub}>No patterns yet. Record one in the Haptics Lab.</Text>}
            </View>
          )}

          <View style={styles.block}>
            <Text style={styles.rowTitle}>Quick launch</Text>
            <Text style={styles.rowSub}>
              In the Shortcuts app, make a shortcut with Open URLs and this link. You can then put it on the Action Button,
              Control Center or the Lock Screen.
            </Text>
            <Text selectable style={styles.link}>fidget://{toyId}</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  discreet: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 40,
  },
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
  barDim: {
    opacity: 0.4,
  },
  round: {
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
    flexShrink: 1,
  },
  right: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
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
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '82%',
    backgroundColor: theme.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: theme.border,
    zIndex: 60,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 18,
  },
  tryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: -8,
  },
  tryText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  rowSub: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.textSecondary,
  },
  block: {
    gap: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipSelected: {
    borderColor: theme.accent,
    backgroundColor: theme.accentGlow,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  chipTextSelected: {
    color: theme.accent,
  },
  link: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.accent,
    fontVariant: ['tabular-nums'],
  },
});
