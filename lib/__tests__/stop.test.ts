import * as Haptics from 'expo-haptics';
import { continuous } from '@/lib/haptics';
import { isQuiet, setActiveToy, stopAllHaptics } from '@/lib/hapticState';
import { Rumble } from '@/lib/rumble';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Every system tap the haptics service plays goes through one of these.
const taps = () =>
  (Haptics.impactAsync as jest.Mock).mock.calls.length +
  (Haptics.selectionAsync as jest.Mock).mock.calls.length +
  (Haptics.notificationAsync as jest.Mock).mock.calls.length;

describe('leaving a toy stops every vibration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    setActiveToy('breathe');
  });
  afterEach(() => {
    continuous.stop();
    jest.useRealTimers();
  });

  it('a continuous vibration stops when the toy closes', () => {
    continuous.set(0.8, 0.5);
    jest.advanceTimersByTime(300);
    expect(taps()).toBeGreaterThan(0);

    setActiveToy(null);
    stopAllHaptics();
    const before = taps();
    jest.advanceTimersByTime(2000);
    expect(taps()).toBe(before);
  });

  it("a closing screen's loop can't restart it during the exit animation", () => {
    setActiveToy(null);
    stopAllHaptics();
    expect(isQuiet()).toBe(true);
    // A stray animation frame from the screen on its way out:
    continuous.set(0.6, 0.2);
    jest.advanceTimersByTime(3000);
    expect(taps()).toBe(0);
  });

  it('a running rumble shuts itself off once the toy closes', () => {
    const rumble = new Rumble();
    rumble.set(0.9);
    jest.advanceTimersByTime(200);
    setActiveToy(null);
    stopAllHaptics();
    const before = taps();
    jest.advanceTimersByTime(3000);
    expect(taps()).toBe(before);
  });

  it('opening the next toy ends the quiet period right away', () => {
    setActiveToy(null);
    stopAllHaptics();
    setActiveToy('cat');
    expect(isQuiet()).toBe(false);
    continuous.set(0.6, 0.2);
    jest.advanceTimersByTime(500);
    expect(taps()).toBeGreaterThan(0);
  });
});
