import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, StatusBar, LayoutChangeEvent, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, Polygon, Rect, Stop } from 'react-native-svg';
import { theme } from '@/constants/colors';
import { continuous, playEvents, transient } from '@/lib/haptics';
import { Point } from '@/lib/pick';
import { peelShapes, pointsString, Rect as Sheet } from '@/lib/peel';
import { useToyOption } from '@/contexts/SettingsContext';
import Segmented from '@/components/ui/Segmented';
import ToyChrome from '@/components/ToyChrome';

type Material = 'film' | 'tape';

const GRAB_RADIUS = 70;
const LIFT_HINT = 22;
const IDLE_MS = 70;
// Lifting the whole sheet by folding would take a drag of twice its diagonal, more than fits on
// a phone. Once half of it is up (corner pulled to the opposite corner), the rest lets go.
const DONE_AT = 0.45;

function sheetFor(material: Material, width: number, height: number): { rect: Sheet; corner: Point } {
  if (material === 'film') {
    const w = width - 64;
    const h = Math.min(height - 40, w * 1.75);
    const rect = { x: 32, y: (height - h) / 2, width: w, height: h };
    return { rect, corner: { x: rect.x + w, y: rect.y + h } };
  }
  const w = width - 56;
  const h = 104;
  const rect = { x: 28, y: (height - h) / 2, width: w, height: h };
  return { rect, corner: { x: rect.x, y: rect.y + h } };
}

/** Where the finger "starts": a little in from the corner, so the corner shows as lifted. */
function liftedCorner(corner: Point, rect: Sheet): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const dx = cx - corner.x;
  const dy = cy - corner.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: corner.x + (dx / len) * LIFT_HINT, y: corner.y + (dy / len) * LIFT_HINT };
}

export default function PeelScreen() {
  const insets = useSafeAreaInsets();
  const [material, setMaterial] = useToyOption<Material>('peel', 'material', 'film');
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const { rect, corner } = useMemo(() => sheetFor(material, stage.width, stage.height), [material, stage]);
  const [finger, setFinger] = useState<Point>({ x: 0, y: 0 });
  const [gone, setGone] = useState<{ flap: Point[]; attached: Point[]; dir: Point } | null>(null);
  const fly = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(1)).current;

  const s = useRef({
    finger: { x: 0, y: 0 } as Point,
    last: { x: 0, y: 0 } as Point,
    lastTime: 0,
    travel: 0,
    nextCatch: 80,
    dipUntil: 0,
    nextCrackle: 0,
    idle: null as ReturnType<typeof setTimeout> | null,
    peeling: false,
    material,
    rect,
    corner,
  }).current;

  // A new material or screen size starts a fresh sheet with its corner lifted.
  const sheetKey = `${material}:${stage.width}:${stage.height}`;
  const [shownKey, setShownKey] = useState(sheetKey);
  if (shownKey !== sheetKey) {
    setShownKey(sheetKey);
    setFinger(liftedCorner(corner, rect));
  }

  useEffect(() => {
    s.material = material;
    s.rect = rect;
    s.corner = corner;
    s.finger = finger;
  }, [s, material, rect, corner, finger]);

  useEffect(() => () => {
    if (s.idle) clearTimeout(s.idle);
  }, [s]);

  const panResponder = useMemo(() => {
    const finish = (shapes: ReturnType<typeof peelShapes>, dir: Point) => {
      s.peeling = false;
      continuous.stop();
      transient(0.9, 0.4);
      playEvents([{ time: 90, intensity: 0.4, sharpness: 0.3 }]);
      setGone({ flap: shapes.flap, attached: shapes.attached, dir });
      fly.setValue(0);
      Animated.timing(fly, { toValue: 1, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
        setGone(null);
        const start = liftedCorner(s.corner, s.rect);
        s.finger = start;
        setFinger(start);
        slideIn.setValue(0);
        Animated.spring(slideIn, { toValue: 1, friction: 9, tension: 60, useNativeDriver: true }).start();
      });
    };

    return PanResponder.create({
      // Grab the lifted edge, wherever it has been pulled to.
      onStartShouldSetPanResponder: evt =>
        Math.hypot(evt.nativeEvent.locationX - s.finger.x, evt.nativeEvent.locationY - s.finger.y) < GRAB_RADIUS,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: evt => {
        s.peeling = true;
        s.last = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
        s.lastTime = Date.now();
        transient(0.5, 0.7);
      },
      onPanResponderMove: evt => {
        if (!s.peeling) return;
        const at = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
        const now = Date.now();
        const step = Math.hypot(at.x - s.last.x, at.y - s.last.y);
        const speed = step / Math.max(1, now - s.lastTime);
        const dir = { x: at.x - s.last.x, y: at.y - s.last.y };
        s.last = at;
        s.lastTime = now;
        s.finger = at;
        setFinger(at);

        const shapes = peelShapes(s.rect, s.corner, at);
        if (shapes.progress >= DONE_AT) {
          finish(shapes, dir);
          return;
        }
        if (step === 0) return;
        s.travel += step;
        const pace = Math.max(0.5, Math.min(2, 0.5 + speed / 0.6));
        if (s.material === 'film') {
          // A smooth pull that now and then catches: a dip, then a crisp snag.
          if (s.travel >= s.nextCatch) {
            s.nextCatch = s.travel + 40 + Math.random() * 80;
            s.dipUntil = now + 50;
            setTimeout(() => transient(0.7, 0.8), 50);
          }
          continuous.set(now < s.dipUntil ? 0.03 : 0.3 * pace, 0.6);
        } else {
          // Tape crackles as the adhesive lets go.
          continuous.set(Math.min(0.8, 0.5 * pace), 0.8);
          if (now >= s.nextCrackle) {
            s.nextCrackle = now + 25 + Math.random() * 55;
            transient(0.2 + Math.random() * 0.2, 0.9);
          }
        }
        if (s.idle) clearTimeout(s.idle);
        s.idle = setTimeout(() => continuous.stop(), IDLE_MS);
      },
      onPanResponderRelease: () => {
        s.peeling = false;
        continuous.stop();
      },
      onPanResponderTerminate: () => {
        s.peeling = false;
        continuous.stop();
      },
    });
  }, [s, fly, slideIn]);

  const shapes = stage.width > 0 ? peelShapes(rect, corner, finger) : null;
  const film = material === 'film';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.stage, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 104 }]}>
        <View
          style={styles.area}
          onLayout={(e: LayoutChangeEvent) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          {...panResponder.panHandlers}
          accessible
          accessibilityLabel={film ? 'Screen film. Drag the lifted corner to peel it.' : 'Masking tape. Drag the lifted end to peel it.'}
        >
          {shapes && (
            <Svg width={stage.width} height={stage.height} pointerEvents="none">
              <Defs>
                <LinearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#1E293B" />
                  <Stop offset="1" stopColor="#0B1120" />
                </LinearGradient>
                <LinearGradient id="filmFlap" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
                  <Stop offset="1" stopColor="#E0F2FE" stopOpacity={0.22} />
                </LinearGradient>
                <LinearGradient id="tapeFlap" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#E9D9A6" />
                  <Stop offset="1" stopColor="#C9B27A" />
                </LinearGradient>
              </Defs>

              {film ? (
                <>
                  <Rect x={rect.x - 10} y={rect.y - 10} width={rect.width + 20} height={rect.height + 20} rx={34} fill="#05070D" />
                  <Rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={26} fill="url(#screen)" />
                  {Array.from({ length: 16 }, (_, i) => (
                    <Rect
                      key={i}
                      x={rect.x + 24 + (i % 4) * ((rect.width - 48) / 4) + 6}
                      y={rect.y + 36 + Math.floor(i / 4) * 78}
                      width={(rect.width - 48) / 4 - 12}
                      height={(rect.width - 48) / 4 - 12}
                      rx={12}
                      fill="#334155"
                      opacity={0.7}
                    />
                  ))}
                </>
              ) : (
                <Rect x={0} y={0} width={stage.width} height={stage.height} rx={24} fill="#D6D3CE" opacity={0.9} />
              )}

              {!gone && <Polygon
                points={pointsString(shapes.attached)}
                fill={film ? '#FFFFFF' : '#E8D9A8'}
                fillOpacity={film ? 0.1 : 1}
                stroke={film ? '#FFFFFF' : '#CBB98A'}
                strokeOpacity={film ? 0.35 : 1}
                strokeWidth={1}
              />}
              {shapes.flap.length > 0 && !gone && (
                <>
                  <Polygon points={pointsString(shapes.flap.map(p => ({ x: p.x + 4, y: p.y + 7 })))} fill="#000000" fillOpacity={0.28} />
                  <Polygon points={pointsString(shapes.flap)} fill={film ? 'url(#filmFlap)' : 'url(#tapeFlap)'} stroke={film ? '#FFFFFF' : '#B8A169'} strokeOpacity={0.6} strokeWidth={1} />
                </>
              )}
              {shapes.fold && !gone && (
                <Line x1={shapes.fold[0].x} y1={shapes.fold[0].y} x2={shapes.fold[1].x} y2={shapes.fold[1].y} stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={2} />
              )}
            </Svg>
          )}
          {gone && (
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                  transform: [
                    { translateX: fly.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sign(gone.dir.x || 1) * 260] }) },
                    { translateY: fly.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sign(gone.dir.y || -1) * 200] }) },
                  ],
                },
              ]}
            >
              <Svg width={stage.width} height={stage.height}>
                <Polygon points={pointsString(gone.attached)} fill={film ? '#FFFFFF' : '#E8D9A8'} fillOpacity={film ? 0.2 : 1} />
                <Polygon points={pointsString(gone.flap)} fill={film ? '#FFFFFF' : '#E0CD93'} fillOpacity={film ? 0.35 : 1} />
              </Svg>
            </Animated.View>
          )}
          {!gone && stage.width > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[styles.grabHint, { left: finger.x - 9, top: finger.y - 9, opacity: slideIn }]}
            />
          )}
        </View>
      </View>
      <View style={[styles.picker, { bottom: insets.bottom + 20 }]}>
        <Text style={styles.hint}>Grab the lifted {film ? 'corner' : 'end'} and pull.</Text>
        <Segmented
          label="Material"
          value={material}
          onChange={setMaterial}
          options={[{ value: 'film', label: 'Screen film' }, { value: 'tape', label: 'Masking tape' }]}
        />
      </View>
      <ToyChrome toyId="peel" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  stage: {
    flex: 1,
  },
  area: {
    flex: 1,
  },
  grabHint: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  picker: {
    position: 'absolute',
    left: 20,
    right: 20,
    gap: 10,
  },
  hint: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
