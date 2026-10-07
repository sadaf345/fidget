import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, PanResponder, TouchableOpacity, Text } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { DrawPoint, LineThickness } from '@/types/fidget';

interface DrawingCanvasProps {
  canvasWidth: number;
  canvasHeight: number;
  lineThickness: LineThickness;
  onComplete: (points: DrawPoint[], width: number, height: number, centerX: number, centerY: number) => void;
  onCancel: () => void;
}

const MIN_DRAW_SIZE = 30;
const PADDING = 10;

export default function DrawingCanvas({ canvasWidth, canvasHeight, lineThickness, onComplete, onCancel }: DrawingCanvasProps) {
  const [points, setPoints] = useState<DrawPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const pointsRef = useRef<DrawPoint[]>([]);
  const canvasRef = useRef<View>(null);
  const canvasOffsetRef = useRef({ x: 0, y: 0 });

  const measureCanvas = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.measureInWindow((x: number, y: number) => {
        canvasOffsetRef.current = { x, y };
      });
    }
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touch = evt.nativeEvent;
        const px = touch.locationX;
        const py = touch.locationY;
        const newPoint = { x: px, y: py };
        pointsRef.current = [newPoint];
        setPoints([newPoint]);
        setIsDrawing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      },
      onPanResponderMove: (evt) => {
        const touch = evt.nativeEvent;
        const px = touch.locationX;
        const py = touch.locationY;
        const newPoint = { x: px, y: py };
        pointsRef.current = [...pointsRef.current, newPoint];
        setPoints([...pointsRef.current]);
      },
      onPanResponderRelease: () => {
        setIsDrawing(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      },
      onPanResponderTerminate: () => {
        setIsDrawing(false);
      },
    })
  ).current;

  const handleConfirm = useCallback(() => {
    if (points.length < 2) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    let drawWidth = maxX - minX;
    let drawHeight = maxY - minY;
    if (drawWidth < MIN_DRAW_SIZE) {
      const diff = MIN_DRAW_SIZE - drawWidth;
      minX -= diff / 2;
      drawWidth = MIN_DRAW_SIZE;
    }
    if (drawHeight < MIN_DRAW_SIZE) {
      const diff = MIN_DRAW_SIZE - drawHeight;
      minY -= diff / 2;
      drawHeight = MIN_DRAW_SIZE;
    }

    drawWidth += PADDING * 2;
    drawHeight += PADDING * 2;

    const normalizedPoints = points.map(p => ({
      x: p.x - minX + PADDING,
      y: p.y - minY + PADDING,
    }));

    const centerX = (minX + (drawWidth / 2) - PADDING) / canvasWidth;
    const centerY = (minY + (drawHeight / 2) - PADDING) / canvasHeight;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onComplete(normalizedPoints, drawWidth, drawHeight, centerX, centerY);
  }, [points, canvasWidth, canvasHeight, onComplete]);

  const handleCancel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onCancel();
  }, [onCancel]);

  const handleClear = useCallback(() => {
    pointsRef.current = [];
    setPoints([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.overlay} />
      <View
        ref={canvasRef}
        style={styles.drawArea}
        onLayout={measureCanvas}
        {...panResponder.panHandlers}
      >
        <Svg width={canvasWidth} height={canvasHeight} style={StyleSheet.absoluteFill} pointerEvents="none">
          {points.length >= 2 && (
            <Polyline
              points={pointsString}
              fill="none"
              stroke={theme.accent}
              strokeWidth={lineThickness}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>
      </View>
      <View style={styles.topBar}>
        <Text style={styles.instruction}>
          {points.length === 0 ? 'Draw a line with your finger' : isDrawing ? 'Drawing...' : 'Lift to finish, or keep drawing'}
        </Text>
      </View>
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
          <X size={18} color={theme.textSecondary} />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        {points.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.7}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.confirmBtn, points.length < 2 && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.7}
          disabled={points.length < 2}
        >
          <Check size={18} color={points.length >= 2 ? theme.bg : theme.textMuted} />
          <Text style={[styles.confirmText, points.length < 2 && styles.confirmTextDisabled]}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 15, 0.85)',
  },
  drawArea: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instruction: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.text,
    backgroundColor: 'rgba(22, 22, 31, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.textSecondary,
  },
  clearBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#F87171',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.accent,
  },
  confirmBtnDisabled: {
    backgroundColor: theme.surfaceLight,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.bg,
  },
  confirmTextDisabled: {
    color: theme.textMuted,
  },
});
