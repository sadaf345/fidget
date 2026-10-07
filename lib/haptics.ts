import * as Haptics from 'expo-haptics';
import { HapticPower } from '@/types/fidget';

export function playHaptic(power: HapticPower = 'medium'): void {
  let result: Promise<void>;
  switch (power) {
    case 'light': result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
    case 'heavy': result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); break;
    case 'soft': result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft); break;
    case 'rigid': result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid); break;
    case 'success': result = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
    case 'warning': result = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); break;
    case 'error': result = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); break;
    case 'selection': result = Haptics.selectionAsync(); break;
    default: result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
  }
  result.catch(() => {});
}

export type HapticStep = { at: number; power: HapticPower };

/** Plays taps on a timeline (ms from now). Returns a cancel function. */
export function playSequence(steps: HapticStep[], onStep?: (step: HapticStep, index: number) => void): () => void {
  const timers = steps.map((step, i) =>
    setTimeout(() => {
      playHaptic(step.power);
      onStep?.(step, i);
    }, step.at),
  );
  return () => timers.forEach(clearTimeout);
}
