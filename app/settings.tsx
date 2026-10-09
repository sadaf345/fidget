import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { ChevronLeft } from 'lucide-react-native';
import { theme } from '@/constants/colors';
import { INTENSITY_MAX, INTENSITY_MIN, useSettings } from '@/contexts/SettingsContext';
import { coreHaptics } from '@/lib/coreHaptics';
import { playHaptic, transient } from '@/lib/haptics';
import Slider from '@/components/ui/Slider';
import { sound } from '@/lib/sound/engine';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, setGlobalIntensity, setDiscreet, setSound, setVolume } = useSettings();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
        >
          <ChevronLeft size={20} color={theme.text} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">Settings</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.section}>Feel</Text>
        <View style={styles.card}>
          <Slider
            label="Intensity, all toys"
            value={settings.globalIntensity}
            min={INTENSITY_MIN}
            max={INTENSITY_MAX}
            step={0.05}
            format={v => `${Math.round(v * 100)}%`}
            onChange={setGlobalIntensity}
          />
          <Text style={styles.note}>{"Each toy also has its own intensity in its settings (the gear on the toy's screen)."}</Text>
          <Pressable onPress={() => transient(0.7, 0.6)} style={styles.button} accessibilityRole="button">
            <Text style={styles.buttonText}>Feel it</Text>
          </Pressable>
        </View>

        <View style={[styles.card, styles.row]}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Discreet mode</Text>
            <Text style={styles.note}>
              Dims toys to near-black (your brightness setting stays the same), mutes sound, and keeps the phone from locking
              while a toy is open.
            </Text>
          </View>
          <Switch
            value={settings.discreet}
            onValueChange={on => {
              playHaptic('light');
              setDiscreet(on);
            }}
            trackColor={{ true: theme.accent, false: theme.border }}
            accessibilityLabel="Discreet mode"
          />
        </View>

        <Text style={styles.section}>Sound</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Sounds</Text>
              <Text style={styles.note}>Every toy has its own sounds. They follow your silent switch, and Discreet mode mutes them.</Text>
            </View>
            <Switch
              value={settings.sound}
              onValueChange={on => {
                playHaptic('light');
                setSound(on);
              }}
              trackColor={{ true: theme.accent, false: theme.border }}
              accessibilityLabel="Sounds"
            />
          </View>
          {settings.sound && (
            <Slider
              label="Volume"
              value={settings.volume}
              min={0}
              max={1}
              step={0.05}
              format={v => `${Math.round(v * 100)}%`}
              onChange={v => {
                setVolume(v);
                sound.play('click', { volume: 1 });
              }}
            />
          )}
          {!sound.available && <Text style={styles.note}>This build has no sound engine. The full app build plays sounds.</Text>}
        </View>

        <Text style={styles.section}>Haptics engine</Text>
        <View style={styles.card}>
          <Text style={styles.rowTitle}>{coreHaptics.available ? 'Core Haptics: on' : 'Taps only'}</Text>
          <Text style={styles.note}>
            {coreHaptics.available
              ? 'Continuous vibration with live strength and sharpness.'
              : 'This build can only play system taps. The full app build turns on continuous vibration.'}
          </Text>
        </View>

        <Text style={styles.section}>Quick launch</Text>
        <View style={styles.card}>
          <Text style={styles.note}>
            Every toy has a link, shown in its settings (for example fidget://pick). In the Shortcuts app, make a shortcut with
            Open URLs and that link, then add it to the Action Button, Control Center or the Lock Screen.
          </Text>
        </View>

        <Text style={styles.section}>About</Text>
        <View style={styles.card}>
          <Text style={styles.rowTitle}>fidget {version}</Text>
          <Text style={styles.note}>By Rai Industries. No accounts, no ads, no tracking: nothing leaves your phone.</Text>
        </View>
      </ScrollView>
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
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
  },
  body: {
    padding: 16,
    gap: 10,
  },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 14,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.textSecondary,
  },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
  },
});
