import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedFidget, WidgetConfig } from '@/types/fidget';
import { DEFAULT_WIDGETS } from '@/constants/widgets';

// Keys are unchanged from the Rork build so boards already on a device keep loading.
const PLAYGROUND_KEY = 'fidget_widgets';
const SAVED_FIDGETS_KEY = 'saved_fidgets';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch (e) {
    console.warn(`Could not read ${key}:`, e);
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Could not save ${key}:`, e);
  }
}

export const loadPlayground = () => readJson<WidgetConfig[]>(PLAYGROUND_KEY, DEFAULT_WIDGETS);
export const savePlayground = (widgets: WidgetConfig[]) => writeJson(PLAYGROUND_KEY, widgets);

export const loadSavedFidgets = () => readJson<SavedFidget[]>(SAVED_FIDGETS_KEY, []);
export const saveSavedFidgets = (fidgets: SavedFidget[]) => writeJson(SAVED_FIDGETS_KEY, fidgets);

// Lifetime counters (flakes picked, best RPM, ...) and small preferences.
const STATS_KEY = 'fidget_stats';
const PREFS_KEY = 'fidget_prefs';

export const loadStats = () => readJson<Record<string, number>>(STATS_KEY, {});
export const saveStats = (stats: Record<string, number>) => writeJson(STATS_KEY, stats);

export const loadPrefs = () => readJson<Record<string, string>>(PREFS_KEY, {});
export const savePrefs = (prefs: Record<string, string>) => writeJson(PREFS_KEY, prefs);
