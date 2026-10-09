import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setIntensitySettings } from '@/lib/hapticState';
import { SavedPattern } from '@/lib/patterns';

export const INTENSITY_MIN = 0.25;
export const INTENSITY_MAX = 1.5;

type OptionValue = string | number | boolean;

export interface AppSettings {
  /** Multiplies every haptic in the app (0.25-1.5). */
  globalIntensity: number;
  /** Per-toy multiplier on top of the global one, by toy id. */
  toyIntensity: Record<string, number>;
  /** Dims the screen to near-black, mutes sound, keeps the phone awake while a toy is open. */
  discreet: boolean;
  /** Toy ids, in the order they were favorited. */
  favorites: string[];
  /** Each toy's own settings (dial detent spacing, marble count...). */
  toyOptions: Record<string, Record<string, OptionValue>>;
  /** Toy id -> saved pattern id that replaces its tap haptic. */
  tapPatterns: Record<string, string>;
}

const DEFAULTS: AppSettings = {
  globalIntensity: 1,
  toyIntensity: {},
  discreet: false,
  favorites: [],
  toyOptions: {},
  tapPatterns: {},
};

const SETTINGS_KEY = 'fidget_settings';
const PATTERNS_KEY = 'fidget_patterns';

interface SettingsContextValue {
  settings: AppSettings;
  loaded: boolean;
  patterns: SavedPattern[];
  setGlobalIntensity: (value: number) => void;
  setToyIntensity: (toyId: string, value: number) => void;
  setDiscreet: (on: boolean) => void;
  toggleFavorite: (toyId: string) => void;
  setToyOption: (toyId: string, key: string, value: OptionValue) => void;
  setTapPattern: (toyId: string, patternId: string | null) => void;
  savePattern: (pattern: SavedPattern) => void;
  renamePattern: (id: string, name: string) => void;
  deletePattern: (id: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
  } catch {
    return fallback;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [patterns, setPatterns] = useState<SavedPattern[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      readJson<AppSettings>(SETTINGS_KEY, DEFAULTS),
      AsyncStorage.getItem(PATTERNS_KEY).then(s => (s ? (JSON.parse(s) as SavedPattern[]) : [])).catch(() => []),
    ]).then(([storedSettings, storedPatterns]) => {
      if (cancelled) return;
      setSettings(storedSettings);
      setPatterns(storedPatterns);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the haptics service in step with the multipliers, and persist after load.
  useEffect(() => {
    setIntensitySettings(settings.globalIntensity, settings.toyIntensity);
    if (loaded) AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, loaded]);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns)).catch(() => {});
  }, [patterns, loaded]);

  const update = useCallback((fn: (prev: AppSettings) => AppSettings) => setSettings(fn), []);

  const value = useMemo<SettingsContextValue>(() => ({
    settings,
    loaded,
    patterns,
    setGlobalIntensity: v => update(s => ({ ...s, globalIntensity: v })),
    setToyIntensity: (toyId, v) => update(s => ({ ...s, toyIntensity: { ...s.toyIntensity, [toyId]: v } })),
    setDiscreet: on => update(s => ({ ...s, discreet: on })),
    toggleFavorite: toyId => update(s => ({
      ...s,
      favorites: s.favorites.includes(toyId) ? s.favorites.filter(id => id !== toyId) : [...s.favorites, toyId],
    })),
    setToyOption: (toyId, key, v) => update(s => ({
      ...s,
      toyOptions: { ...s.toyOptions, [toyId]: { ...s.toyOptions[toyId], [key]: v } },
    })),
    setTapPattern: (toyId, patternId) => update(s => {
      const tapPatterns = { ...s.tapPatterns };
      if (patternId) tapPatterns[toyId] = patternId;
      else delete tapPatterns[toyId];
      return { ...s, tapPatterns };
    }),
    savePattern: p => setPatterns(prev => [p, ...prev]),
    renamePattern: (id, name) => setPatterns(prev => prev.map(p => (p.id === id ? { ...p, name } : p))),
    deletePattern: id => {
      setPatterns(prev => prev.filter(p => p.id !== id));
      // A toy using a deleted pattern goes back to its own tap.
      update(s => ({ ...s, tapPatterns: Object.fromEntries(Object.entries(s.tapPatterns).filter(([, pid]) => pid !== id)) }));
    },
  }), [settings, loaded, patterns, update]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside a SettingsProvider');
  return value;
}

/** One of a toy's own settings, with a default. */
export function useToyOption<T extends OptionValue>(toyId: string, key: string, fallback: T): [T, (value: T) => void] {
  const { settings, setToyOption } = useSettings();
  const stored = settings.toyOptions[toyId]?.[key];
  const value = (stored ?? fallback) as T;
  const set = useCallback((v: T) => setToyOption(toyId, key, v), [setToyOption, toyId, key]);
  return [value, set];
}
