import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Line, Polygon, Rect } from 'react-native-svg';

const SIZE = 52;

/** Little lifted flake on a patch of skin. */
export function PickArt() {
  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle cx={26} cy={26} r={24} fill="#E5B898" />
      <Circle cx={15} cy={17} r={1.6} fill="#C99674" />
      <Circle cx={37} cy={36} r={1.4} fill="#C99674" />
      <Circle cx={14} cy={36} r={1.2} fill="#C99674" />
      <Polygon points="21,22 33,18 38,27 31,35 21,32" fill="#7A4E35" opacity={0.45} />
      <Polygon points="19,20 31,15 36,24 30,33 19,30" fill="#F6E1D2" stroke="#B88565" strokeWidth={1} strokeLinejoin="round" />
    </Svg>
  );
}

/** A corner of a pop-it sheet, one bubble already pushed in. */
export function PopArt() {
  const bubbles = [
    { x: 15, y: 15, c: '#FF6B6B', popped: false },
    { x: 37, y: 15, c: '#FECA57', popped: true },
    { x: 15, y: 37, c: '#1DD1A1', popped: false },
    { x: 37, y: 37, c: '#54A0FF', popped: false },
  ];
  return (
    <Svg width={SIZE} height={SIZE}>
      {bubbles.map(b => (
        <React.Fragment key={`${b.x}-${b.y}`}>
          <Circle cx={b.x} cy={b.y} r={10} fill={b.c} opacity={b.popped ? 0.55 : 1} />
          {b.popped ? (
            <Circle cx={b.x} cy={b.y} r={7} fill="none" stroke="#000000" strokeOpacity={0.25} strokeWidth={2} />
          ) : (
            <Circle cx={b.x - 3} cy={b.y - 3} r={3} fill="#FFFFFF" opacity={0.55} />
          )}
        </React.Fragment>
      ))}
    </Svg>
  );
}

/** Concentric rings that breathe. */
export function ChargeArt({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View style={{ width: SIZE, height: SIZE, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }] }}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={26} cy={26} r={23} fill="none" stroke={color} strokeOpacity={0.3} strokeWidth={2} />
        <Circle cx={26} cy={26} r={16} fill="none" stroke={color} strokeOpacity={0.6} strokeWidth={2} />
        <Circle cx={26} cy={26} r={9} fill={color} />
        <Circle cx={26} cy={26} r={3.5} fill="#FFFFFF" opacity={0.85} />
      </Svg>
    </Animated.View>
  );
}

/** A tiny spinner, slowly turning. */
export function SpinArt({ color }: { color: string }) {
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [turn]);
  const lobes = [-90, 30, 150].map(deg => ({ x: 26 + Math.cos((deg * Math.PI) / 180) * 15, y: 26 + Math.sin((deg * Math.PI) / 180) * 15 }));
  return (
    <Animated.View style={{ width: SIZE, height: SIZE, transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <Svg width={SIZE} height={SIZE}>
        {lobes.map((p, i) => <Line key={`a${i}`} x1={26} y1={26} x2={p.x} y2={p.y} stroke={color} strokeWidth={10} strokeLinecap="round" />)}
        <Circle cx={26} cy={26} r={10} fill={color} />
        {lobes.map((p, i) => (
          <React.Fragment key={`l${i}`}>
            <Circle cx={p.x} cy={p.y} r={9} fill={color} />
            <Circle cx={p.x} cy={p.y} r={5} fill="#E4E6EE" />
          </React.Fragment>
        ))}
        <Circle cx={26} cy={26} r={6} fill="#E4E6EE" />
      </Svg>
    </Animated.View>
  );
}

/** A jar of beads that wobbles like it's being shaken. */
export function ShakeArt({ color }: { color: string }) {
  const wobble = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(wobble, { toValue: -1, duration: 160, useNativeDriver: true }),
        Animated.timing(wobble, { toValue: 0.6, duration: 130, useNativeDriver: true }),
        Animated.timing(wobble, { toValue: 0, duration: 110, useNativeDriver: true }),
        Animated.delay(1400),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [wobble]);
  const beads = [
    { x: 19, y: 36, c: '#FF6B6B' },
    { x: 31, y: 37, c: '#FECA57' },
    { x: 25, y: 27, c: '#54A0FF' },
    { x: 34, y: 25, c: '#1DD1A1' },
    { x: 18, y: 22, c: '#A78BFA' },
  ];
  return (
    <Animated.View style={{ width: SIZE, height: SIZE, transform: [{ rotate: wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '9deg'] }) }] }}>
      <Svg width={SIZE} height={SIZE}>
        <Rect x={9} y={8} width={34} height={38} rx={10} fill="none" stroke={color} strokeOpacity={0.7} strokeWidth={2} />
        {beads.map(b => (
          <React.Fragment key={`${b.x}-${b.y}`}>
            <Circle cx={b.x} cy={b.y} r={5.2} fill={b.c} />
            <Circle cx={b.x - 1.6} cy={b.y - 1.6} r={1.5} fill="#FFFFFF" opacity={0.7} />
          </React.Fragment>
        ))}
      </Svg>
    </Animated.View>
  );
}
