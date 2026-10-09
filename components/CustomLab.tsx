import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated, Alert, Easing } from 'react-native';
import { Check, Circle as RecordIcon, Pencil, Play, Square, Trash2 } from 'lucide-react-native';
import { theme } from '@/constants/colors';
import { useSettings } from '@/contexts/SettingsContext';
import { coreHaptics } from '@/lib/coreHaptics';
import { continuous, HapticEvent, playEvents, playHaptic, transient } from '@/lib/haptics';
import { fromAhap, MAX_RECORDING_MS, patternDurationMs, toAhap } from '@/lib/patterns';
import Segmented from '@/components/ui/Segmented';
import Slider from '@/components/ui/Slider';
import { sound, useLoop } from '@/lib/sound/engine';

/** A click that sounds like the haptic: sharper is higher, stronger is louder. */
function tapSound(intensity: number, sharpness: number, delay = 0) {
  sound.play('click', { volume: 0.25 + 0.9 * intensity, rate: 0.45 + 1.35 * sharpness, delay, vary: 0.02 });
}

/** Plays a recorded pattern with a matching click for every tap. */
function playWithSound(events: HapticEvent[]) {
  playEvents(events);
  events.forEach(e => tapSound(e.intensity, e.sharpness, e.time));
}

type Mode = 'transient' | 'continuous';

interface CustomLabProps {
  /** Told when a finger is on the pad, so the page can stop scrolling. */
  onPadActive: (active: boolean) => void;
}

/** Haptics Lab "Custom": tune intensity and sharpness, feel them, record rhythms as AHAP patterns. */
export default function CustomLab({ onPadActive }: CustomLabProps) {
  const { patterns, savePattern, renamePattern, deletePattern } = useSettings();
  const [mode, setMode] = useState<Mode>('transient');
  const [intensity, setIntensity] = useState(0.6);
  const [sharpness, setSharpness] = useState(0.5);
  const [durationMs, setDurationMs] = useState(400);
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState<HapticEvent[] | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const flash = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const rec = useRef({ start: 0, events: [] as HapticEvent[], timer: null as ReturnType<typeof setTimeout> | null }).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tone = useLoop('noise', { type: 'bandpass', freq: 1500, q: 3 });

  useEffect(() => () => {
    if (rec.timer) clearTimeout(rec.timer);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    continuous.stop();
  }, [rec]);

  const stopRecording = () => {
    if (rec.timer) clearTimeout(rec.timer);
    rec.timer = null;
    setRecording(false);
    progress.stopAnimation();
    if (rec.events.length > 0) {
      setDraft(rec.events);
      setDraftName(`Pattern ${patterns.length + 1}`);
    }
  };

  const startRecording = () => {
    playHaptic('light');
    rec.events = [];
    rec.start = 0;
    setDraft(null);
    setRecording(true);
    progress.setValue(0);
  };

  const pulse = () => {
    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };

  const padDown = () => {
    onPadActive(true);
    pulse();
    if (recording) {
      const now = Date.now();
      // The clock starts at the first tap, so a pattern never begins with silence.
      if (rec.events.length === 0) {
        rec.start = now;
        Animated.timing(progress, { toValue: 1, duration: MAX_RECORDING_MS, easing: Easing.linear, useNativeDriver: true }).start();
        rec.timer = setTimeout(stopRecording, MAX_RECORDING_MS);
      }
      rec.events.push({ time: now - rec.start, intensity, sharpness });
      transient(intensity, sharpness);
      tapSound(intensity, sharpness);
      return;
    }
    if (mode === 'transient') {
      transient(intensity, sharpness);
      tapSound(intensity, sharpness);
    } else {
      continuous.set(intensity, sharpness);
      tone.set({ volume: 0.1 + 0.4 * intensity, freq: 250 + 5000 * sharpness, q: 2 + 6 * sharpness });
      if (holdTimer.current) clearTimeout(holdTimer.current);
      holdTimer.current = setTimeout(() => {
        continuous.stop();
        tone.stop(40);
      }, durationMs);
    }
  };

  const padUp = () => {
    onPadActive(false);
    if (mode === 'continuous' && !recording) {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      continuous.stop();
      tone.stop(40);
    }
  };

  const save = () => {
    if (!draft) return;
    playHaptic('success');
    savePattern({ id: `pattern-${Date.now()}`, name: draftName.trim() || `Pattern ${patterns.length + 1}`, createdAt: Date.now(), ahap: toAhap(draft) });
    setDraft(null);
  };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete pattern', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePattern(id) },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.engine}>
        {coreHaptics.available ? 'Core Haptics is on: these values play exactly.' : 'This build plays the closest system tap to these values.'}
      </Text>

      <Segmented
        label="Haptic type"
        value={mode}
        onChange={setMode}
        options={[{ value: 'transient', label: 'Tap' }, { value: 'continuous', label: 'Hold' }]}
      />
      <Slider label="Intensity" value={intensity} min={0} max={1} step={0.05} onChange={setIntensity} />
      <Slider label="Sharpness" value={sharpness} min={0} max={1} step={0.05} onChange={setSharpness} />
      {mode === 'continuous' && (
        <Slider label="Duration" value={durationMs} min={50} max={2000} step={50} format={v => `${Math.round(v)} ms`} onChange={setDurationMs} />
      )}

      <View
        style={[styles.pad, recording && styles.padRecording]}
        onTouchStart={padDown}
        onTouchEnd={padUp}
        onTouchCancel={padUp}
        accessible
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Tap a rhythm' : 'Feel it'}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={() => {
          padDown();
          setTimeout(padUp, Math.min(durationMs, 300));
        }}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.padFlash, { opacity: flash }]} />
        <Text style={styles.padText} pointerEvents="none">{recording ? 'Tap a rhythm' : 'Feel it'}</Text>
        <Text style={styles.padSub} pointerEvents="none">
          {recording ? 'Up to 5 seconds from your first tap' : mode === 'continuous' ? 'Press and hold' : 'Tap'}
        </Text>
        {recording && (
          <Animated.View pointerEvents="none" style={[styles.progress, { transform: [{ scaleX: progress }] }]} />
        )}
      </View>

      {recording ? (
        <Pressable onPress={stopRecording} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <Square size={14} color={theme.danger} fill={theme.danger} />
          <Text style={styles.buttonText}>Stop recording</Text>
        </Pressable>
      ) : draft ? (
        <View style={styles.draft}>
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            style={styles.input}
            placeholder="Name it"
            placeholderTextColor={theme.textMuted}
            maxLength={30}
            returnKeyType="done"
            accessibilityLabel="Pattern name"
          />
          <View style={styles.draftButtons}>
            <Pressable onPress={() => playWithSound(draft)} style={styles.smallButton} accessibilityRole="button" accessibilityLabel="Preview">
              <Play size={14} color={theme.text} />
            </Pressable>
            <Pressable onPress={() => setDraft(null)} style={styles.smallButton} accessibilityRole="button">
              <Text style={styles.smallText}>Discard</Text>
            </Pressable>
            <Pressable onPress={save} style={[styles.smallButton, styles.saveButton]} accessibilityRole="button">
              <Text style={[styles.smallText, styles.saveText]}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={startRecording} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <RecordIcon size={14} color={theme.danger} fill={theme.danger} />
          <Text style={styles.buttonText}>Record a pattern</Text>
        </Pressable>
      )}

      {patterns.length > 0 && (
        <View style={styles.list}>
          <Text style={styles.listTitle}>Saved patterns</Text>
          {patterns.map(p => {
            const taps = p.ahap.Pattern.length;
            const seconds = (patternDurationMs(p) / 1000).toFixed(1);
            const isEditing = editing?.id === p.id;
            return (
              <View key={p.id} style={styles.row}>
                {isEditing ? (
                  <TextInput
                    value={editing.name}
                    onChangeText={name => setEditing({ id: p.id, name })}
                    style={[styles.input, styles.rowInput]}
                    autoFocus
                    maxLength={30}
                    onSubmitEditing={() => {
                      renamePattern(p.id, editing.name.trim() || p.name);
                      setEditing(null);
                    }}
                    accessibilityLabel="Rename pattern"
                  />
                ) : (
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.rowMeta}>{taps} {taps === 1 ? 'tap' : 'taps'} · {seconds}s</Text>
                  </View>
                )}
                <Pressable onPress={() => playWithSound(fromAhap(p.ahap))} style={styles.icon} accessibilityRole="button" accessibilityLabel={`Play ${p.name}`}>
                  <Play size={16} color={theme.text} />
                </Pressable>
                {isEditing ? (
                  <Pressable
                    onPress={() => {
                      renamePattern(p.id, editing.name.trim() || p.name);
                      setEditing(null);
                    }}
                    style={styles.icon}
                    accessibilityRole="button"
                    accessibilityLabel="Done renaming"
                  >
                    <Check size={16} color={theme.accent} />
                  </Pressable>
                ) : (
                  <Pressable onPress={() => setEditing({ id: p.id, name: p.name })} style={styles.icon} accessibilityRole="button" accessibilityLabel={`Rename ${p.name}`}>
                    <Pencil size={15} color={theme.textSecondary} />
                  </Pressable>
                )}
                <Pressable onPress={() => confirmDelete(p.id, p.name)} style={styles.icon} accessibilityRole="button" accessibilityLabel={`Delete ${p.name}`}>
                  <Trash2 size={15} color={theme.danger} />
                </Pressable>
              </View>
            );
          })}
          <Text style={styles.engine}>Use a pattern on Switch tester, Pen click, Toggle wall or Tally counter from their settings.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  engine: {
    fontSize: 12.5,
    color: theme.textMuted,
    lineHeight: 17,
  },
  pad: {
    height: 150,
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 4,
  },
  padRecording: {
    borderColor: theme.danger,
  },
  padFlash: {
    backgroundColor: theme.accent,
  },
  padText: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
  },
  padSub: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  progress: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: theme.danger,
    transformOrigin: 'left',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  draft: {
    gap: 10,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    color: theme.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  draftButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  smallButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  saveButton: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  saveText: {
    color: theme.bg,
  },
  list: {
    gap: 8,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 14,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rowText: {
    flex: 1,
  },
  rowInput: {
    flex: 1,
    paddingVertical: 7,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  rowMeta: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceLight,
  },
});
