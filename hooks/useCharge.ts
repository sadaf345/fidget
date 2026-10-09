import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, PanResponderInstance } from 'react-native';
import { HapticPower } from '@/types/fidget';
import { playHaptic, playSequence } from '@/lib/haptics';
import { Rumble } from '@/lib/rumble';
import { coreHaptics } from '@/lib/coreHaptics';
import { angleAround, angleDelta } from '@/lib/spin';
import { ChargeState, chargeIntensity, climaxPattern, initialCharge, RELEASE_PATTERN, stepCharge } from '@/lib/charge';

// Finger closer than this to the center has no meaningful angle, so it doesn't wind.
const MIN_WIND_RADIUS = 14;
// One ratchet click per this many degrees wound.
const RATCHET_DEG = 15;

export interface ChargeHandle {
  panHandlers: PanResponderInstance['panHandlers'];
  /** 0..1 charge level. */
  charge: Animated.Value;
  /** Spikes to 1 on every rumble tap, then decays; drives the visual throb. */
  pulse: Animated.Value;
  /** Runs 0 to 1 after each climax; drives the shockwave. */
  climax: Animated.Value;
  pressing: boolean;
  combo: number;
}

interface UseChargeOptions {
  /** Center of the touch target in its own coordinates. Its children must ignore touches. */
  center: { x: number; y: number };
  disabled?: boolean;
  hapticPower?: HapticPower;
  onClimax?: (combo: number) => void;
}

export function useCharge({ center, disabled, hapticPower = 'medium', onClimax }: UseChargeOptions): ChargeHandle {
  const charge = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const climax = useRef(new Animated.Value(0)).current;
  const [pressing, setPressing] = useState(false);
  const [combo, setCombo] = useState(0);

  const optionsRef = useRef({ center, disabled, hapticPower, onClimax });
  useEffect(() => {
    optionsRef.current = { center, disabled, hapticPower, onClimax };
  });

  const engine = useRef({
    state: initialCharge() as ChargeState,
    frame: null as number | null,
    last: null as number | null,
    wind: 0,
    ratchet: 0,
    fingerAngle: null as number | null,
    cancelSequence: null as (() => void) | null,
    rumble: null as Rumble | null,
  }).current;

  useEffect(() => () => {
    if (engine.frame !== null) cancelAnimationFrame(engine.frame);
    engine.rumble?.stop();
    engine.cancelSequence?.();
  }, [engine]);

  const panResponder = useMemo(() => {
    engine.rumble = new Rumble(() => {
      pulse.setValue(1);
      Animated.timing(pulse, { toValue: 0, duration: 110, useNativeDriver: true }).start();
    });

    const tick = (ts: number) => {
      const dt = engine.last === null ? 16.67 : Math.min(ts - engine.last, 50);
      engine.last = ts;
      const wind = engine.wind;
      engine.wind = 0;

      const result = stepCharge(engine.state, dt, wind);
      engine.state = result.state;
      charge.setValue(result.state.level);

      if (result.climaxed) {
        // With Core Haptics the aftershocks are one continuous wave dying away; with taps
        // it's silence plus discrete aftershocks from the pattern.
        const continuous = coreHaptics.available;
        if (continuous) engine.rumble?.fade(1, 750);
        else engine.rumble?.set(0);
        engine.cancelSequence?.();
        engine.cancelSequence = playSequence(climaxPattern(result.state.combo, !continuous));
        climax.setValue(0);
        Animated.timing(climax, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        setCombo(result.state.combo);
        optionsRef.current.onClimax?.(result.state.combo);
      } else if (result.state.afterglowMs === 0) {
        engine.rumble?.set(chargeIntensity(result.state.level));
      }
      engine.frame = requestAnimationFrame(tick);
    };

    const angleOf = (x: number, y: number): number | null => {
      const c = optionsRef.current.center;
      return Math.hypot(x - c.x, y - c.y) < MIN_WIND_RADIUS ? null : angleAround(c.x, c.y, x, y);
    };

    const end = () => {
      if (engine.frame !== null) cancelAnimationFrame(engine.frame);
      engine.frame = null;
      // Letting go right after a climax shouldn't cut the aftershocks off.
      if (engine.state.afterglowMs === 0) engine.rumble?.stop();
      if (engine.state.level > 0.2 && engine.state.afterglowMs === 0) {
        engine.cancelSequence?.();
        engine.cancelSequence = playSequence(RELEASE_PATTERN);
      }
      engine.state = initialCharge();
      setPressing(false);
      charge.stopAnimation();
      Animated.spring(charge, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => !optionsRef.current.disabled,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        engine.cancelSequence?.();
        engine.state = initialCharge();
        engine.last = null;
        engine.wind = 0;
        engine.ratchet = 0;
        engine.fingerAngle = angleOf(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        charge.stopAnimation();
        charge.setValue(0);
        setPressing(true);
        setCombo(0);
        playHaptic(optionsRef.current.hapticPower);
        engine.frame = requestAnimationFrame(tick);
      },
      onPanResponderMove: (evt) => {
        const angle = angleOf(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        if (angle !== null && engine.fingerAngle !== null) {
          const delta = angleDelta(engine.fingerAngle, angle);
          engine.wind += delta;
          engine.ratchet += delta;
          if (Math.abs(engine.ratchet) >= RATCHET_DEG) {
            playHaptic(engine.ratchet > 0 ? 'rigid' : 'soft');
            engine.ratchet %= RATCHET_DEG;
          }
        }
        engine.fingerAngle = angle;
      },
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  }, [engine, charge, pulse, climax]);

  return { panHandlers: panResponder.panHandlers, charge, pulse, climax, pressing, combo };
}
