import React, { useRef, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { HapticPower, LineThickness, DrawPoint } from '@/types/fidget';
import { playHaptic } from '@/lib/haptics';
import { sound } from '@/lib/sound/engine';

interface LineWidgetProps {
  disabled?: boolean;
  hapticPower?: HapticPower;
  lineThickness?: LineThickness;
  hasSlider?: boolean;
  drawPoints?: DrawPoint[];
  drawWidth?: number;
  drawHeight?: number;
}

const SLIDER_SIZE = 28;

function getClosestPointOnPath(points: DrawPoint[], tx: number, ty: number): { point: DrawPoint; index: number; t: number } {
  let bestDist = Infinity;
  let bestPoint: DrawPoint = points[0];
  let bestIndex = 0;
  let bestT = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const ax = points[i].x;
    const ay = points[i].y;
    const bx = points[i + 1].x;
    const by = points[i + 1].y;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = Math.max(0, Math.min(1, ((tx - ax) * dx + (ty - ay) * dy) / lenSq));
    }
    const px = ax + t * dx;
    const py = ay + t * dy;
    const dist = (tx - px) * (tx - px) + (ty - py) * (ty - py);
    if (dist < bestDist) {
      bestDist = dist;
      bestPoint = { x: px, y: py };
      bestIndex = i;
      bestT = t;
    }
  }

  return { point: bestPoint, index: bestIndex, t: bestT };
}

const SEARCH_RADIUS_SEGMENTS = 30;

function getConstrainedPointOnPath(
  points: DrawPoint[],
  tx: number,
  ty: number,
  currentIndex: number,
  currentT: number,
): { point: DrawPoint; index: number; t: number } {
  const startSeg = Math.max(0, currentIndex - SEARCH_RADIUS_SEGMENTS);
  const endSeg = Math.min(points.length - 2, currentIndex + SEARCH_RADIUS_SEGMENTS);

  let bestDist = Infinity;
  let bestPoint: DrawPoint = points[currentIndex];
  let bestIndex = currentIndex;
  let bestT = currentT;

  for (let i = startSeg; i <= endSeg; i++) {
    const ax = points[i].x;
    const ay = points[i].y;
    const bx = points[i + 1].x;
    const by = points[i + 1].y;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = Math.max(0, Math.min(1, ((tx - ax) * dx + (ty - ay) * dy) / lenSq));
    }
    const px = ax + t * dx;
    const py = ay + t * dy;
    const dist = (tx - px) * (tx - px) + (ty - py) * (ty - py);
    if (dist < bestDist) {
      bestDist = dist;
      bestPoint = { x: px, y: py };
      bestIndex = i;
      bestT = t;
    }
  }

  return { point: bestPoint, index: bestIndex, t: bestT };
}

function getCumulativeLength(points: DrawPoint[]): number[] {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    lengths.push(lengths[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  return lengths;
}

export default function LineWidget({
  disabled,
  hapticPower = 'medium',
  lineThickness = 2,
  hasSlider = false,
  drawPoints,
  drawWidth = 200,
  drawHeight = 36,
}: LineWidgetProps) {
  const [sliderPos, setSliderPos] = useState<DrawPoint | null>(() => {
    if (hasSlider && drawPoints && drawPoints.length >= 2) {
      const randIdx = Math.floor(Math.random() * (drawPoints.length - 1));
      const t = Math.random();
      const a = drawPoints[randIdx];
      const b = drawPoints[randIdx + 1];
      return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    }
    return null;
  });
  const [sliderActive, setSliderActive] = useState(false);
  const lastHapticTime = useRef(0);
  const lastMoveTime = useRef(0);
  const lastProgress = useRef(0);
  const currentSegIndex = useRef(0);
  const currentSegT = useRef(0);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const hapticPowerRef = useRef(hapticPower);
  hapticPowerRef.current = hapticPower;
  const drawPointsRef = useRef(drawPoints);
  drawPointsRef.current = drawPoints;

  const cumulativeLengths = useMemo(() => {
    if (!drawPoints || drawPoints.length < 2) return [];
    return getCumulativeLength(drawPoints);
  }, [drawPoints]);

  const getHapticInterval = useCallback((speed: number): number => {
    if (speed < 50) return 200;
    if (speed < 150) return 120;
    if (speed < 300) return 70;
    return 40;
  }, []);

  const sliderPanResponder = useMemo(() => {
    if (!hasSlider || !drawPoints || drawPoints.length < 2) return null;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onStartShouldSetPanResponderCapture: () => !disabledRef.current,
      onMoveShouldSetPanResponderCapture: () => !disabledRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        setSliderActive(true);
        playHaptic(hapticPowerRef.current);
        lastMoveTime.current = Date.now();
        const pts = drawPointsRef.current;
        if (pts && pts.length >= 2) {
          const touch = evt.nativeEvent;
          const result = getClosestPointOnPath(pts, touch.locationX, touch.locationY);
          currentSegIndex.current = result.index;
          currentSegT.current = result.t;
          setSliderPos(result.point);
        }
      },
      onPanResponderMove: (evt) => {
        const pts = drawPointsRef.current;
        if (!pts || pts.length < 2) return;
        const touch = evt.nativeEvent;
        const result = getConstrainedPointOnPath(
          pts,
          touch.locationX,
          touch.locationY,
          currentSegIndex.current,
          currentSegT.current,
        );
        currentSegIndex.current = result.index;
        currentSegT.current = result.t;
        setSliderPos(result.point);

        const now = Date.now();
        const dt = now - lastMoveTime.current;
        if (dt > 0) {
          const totalLen = cumulativeLengths[cumulativeLengths.length - 1] || 1;
          const segLen = cumulativeLengths[result.index] || 0;
          const segDx = pts[result.index + 1].x - pts[result.index].x;
          const segDy = pts[result.index + 1].y - pts[result.index].y;
          const segLength = Math.sqrt(segDx * segDx + segDy * segDy);
          const progress = (segLen + result.t * segLength) / totalLen;
          const speed = Math.abs(progress - lastProgress.current) / dt * 1000 * totalLen;
          const interval = getHapticInterval(speed);
          if (now - lastHapticTime.current >= interval) {
            playHaptic(hapticPowerRef.current);
            sound.play('rib', { volume: 0.45 });
            lastHapticTime.current = now;
          }
          lastProgress.current = progress;
        }
        lastMoveTime.current = now;
      },
      onPanResponderRelease: () => {
        setSliderActive(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      },
      onPanResponderTerminate: () => {
        setSliderActive(false);
      },
    });
  }, [hasSlider, drawPoints, cumulativeLengths, getHapticInterval]);

  if (!drawPoints || drawPoints.length < 2) {
    const effectiveThickness = Math.max(lineThickness, 0.5);
    return (
      <View style={[styles.fallbackContainer, { height: Math.max(20, effectiveThickness + 16) }]}>
        <View
          style={[
            styles.fallbackLine,
            { height: effectiveThickness, borderRadius: effectiveThickness / 2 },
          ]}
        />
      </View>
    );
  }

  const pointsString = drawPoints.map(p => `${p.x},${p.y}`).join(' ');
  const initialSliderPos = sliderPos || drawPoints[0];

  return (
    <View
      style={{ width: drawWidth, height: drawHeight }}
      {...(sliderPanResponder ? sliderPanResponder.panHandlers : {})}
    >
      <Svg width={drawWidth} height={drawHeight} pointerEvents="none">
        <Polyline
          points={pointsString}
          fill="none"
          stroke={theme.textSecondary}
          strokeWidth={lineThickness}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {hasSlider && (
        <View
          pointerEvents="none"
          style={[
            styles.slider,
            sliderActive && styles.sliderActive,
            {
              left: initialSliderPos.x - SLIDER_SIZE / 2,
              top: initialSliderPos.y - SLIDER_SIZE / 2,
            },
          ]}
        >
          <View style={[styles.sliderInner, sliderActive && styles.sliderInnerActive]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    width: 200,
    justifyContent: 'center',
    position: 'relative',
  },
  fallbackLine: {
    width: '100%',
    backgroundColor: theme.textSecondary,
  },
  slider: {
    position: 'absolute',
    width: SLIDER_SIZE,
    height: SLIDER_SIZE,
    borderRadius: SLIDER_SIZE / 2,
    backgroundColor: '#0E0E14',
    borderWidth: 2,
    borderColor: '#3A3A4A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sliderActive: {
    borderColor: theme.accent,
    shadowOpacity: 0.5,
  },
  sliderInner: {
    width: SLIDER_SIZE - 10,
    height: SLIDER_SIZE - 10,
    borderRadius: (SLIDER_SIZE - 10) / 2,
    backgroundColor: '#1A1A24',
  },
  sliderInnerActive: {
    backgroundColor: '#1E3A38',
  },
});
