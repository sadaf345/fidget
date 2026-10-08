import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type AccelerometerApi = typeof import('expo-sensors').Accelerometer;

/**
 * The accelerometer, or null in builds made before expo-sensors was added (and on web).
 * Readings are in g, Apple's convention: upright at rest reads y = -1.
 */
function loadAccelerometer(): AccelerometerApi | null {
  if (Platform.OS === 'web' || !requireOptionalNativeModule('ExponentAccelerometer')) return null;
  // A static import would crash older builds that don't include the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('expo-sensors') as typeof import('expo-sensors')).Accelerometer;
}

export const accelerometer = loadAccelerometer();
