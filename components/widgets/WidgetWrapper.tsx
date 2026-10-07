import React, { useRef, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Animated, PanResponder, TouchableOpacity } from 'react-native';
import { X, RotateCw, Lock, Unlock, CircleDot } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';
import { WidgetConfig, WidgetType } from '@/types/fidget';
import { useFidget } from '@/contexts/FidgetContext';
import { playHaptic } from '@/lib/haptics';
import PressHoldWidget from './PressHoldWidget';
import ScrollWheelWidget from './ScrollWheelWidget';
import HorizontalScrollWidget from './HorizontalScrollWidget';
import SwipePadWidget from './SwipePadWidget';
import LineWidget from './LineWidget';

const BASE_SIZES: Record<WidgetType, { width: number; height: number }> = {
  'press-hold': { width: 110, height: 110 },
  'scroll-wheel': { width: 140, height: 140 },
  'horizontal-scroll': { width: 160, height: 64 },
  'swipe-pad': { width: 140, height: 140 },
  'line': { width: 200, height: 36 },
};

function getWidgetBaseSize(widget: WidgetConfig): { width: number; height: number } {
  if (widget.type === 'line' && widget.drawWidth && widget.drawHeight) {
    return { width: widget.drawWidth, height: widget.drawHeight };
  }
  return BASE_SIZES[widget.type];
}

// Padding + border around every widget, kept constant so a widget's center doesn't shift in edit mode.
const CONTENT_PADDING = 4;
const CONTENT_BORDER = 1.5;
const FRAME = (CONTENT_PADDING + CONTENT_BORDER) * 2;

function getWidgetFrameSize(widget: WidgetConfig): { width: number; height: number } {
  const base = getWidgetBaseSize(widget);
  return { width: base.width + FRAME, height: base.height + FRAME };
}

const MIN_SCALE = 0.5;
const MAX_SCALE_CAP = 2.5;
// Rotation clicks into place within this many degrees of a 45° angle.
const ROTATION_SNAP_STEP = 45;
const ROTATION_SNAP_RANGE = 4;

function getMaxScale(widget: WidgetConfig, cw: number, ch: number): number {
  const base = getWidgetFrameSize(widget);
  return Math.min((cw - 20) / base.width, (ch - 20) / base.height, MAX_SCALE_CAP);
}

function getDistance(touches: { pageX: number; pageY: number }[]): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].pageX - touches[1].pageX;
  const dy = touches[0].pageY - touches[1].pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

interface WidgetWrapperProps {
  widget: WidgetConfig;
  canvasWidth: number;
  canvasHeight: number;
}

function WidgetWrapperInner({ widget, canvasWidth, canvasHeight }: WidgetWrapperProps) {
  const { editMode, updateWidgetPosition, updateWidgetRotation, updateWidgetScale, removeWidget, toggleWidgetLock, toggleWidgetSlider } = useFidget();

  const widgetScale = widget.scale ?? 1;
  const frameSize = getWidgetFrameSize(widget);
  const posX = useRef(new Animated.Value(widget.x * canvasWidth)).current;
  const posY = useRef(new Animated.Value(widget.y * canvasHeight)).current;
  // Shown while the rotate handle is dragged; committed to the board once on release.
  const [liveRotation, setLiveRotation] = useState<number | null>(null);
  const rotation = liveRotation ?? widget.rotation;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pinchScaleAnim = useRef(new Animated.Value(widgetScale)).current;
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const dragStartPos = useRef({ x: widget.x * canvasWidth, y: widget.y * canvasHeight });
  const wrapperRef = useRef<View>(null);
  const wiggleRef = useRef<Animated.CompositeAnimation | null>(null);

  const stateRef = useRef({
    editMode,
    widget,
    canvasWidth,
    canvasHeight,
    currentRotation: widget.rotation,
    liveRotation: null as number | null,
    rotationStart: 0,
    fingerStartAngle: 0,
    widgetCenter: { x: 0, y: 0 },
    isRotating: false,
    isPinching: false,
    pinchStartDist: 0,
    pinchStartScale: widgetScale,
    currentScale: widgetScale,
  });
  stateRef.current.editMode = editMode;
  stateRef.current.widget = widget;
  stateRef.current.canvasWidth = canvasWidth;
  stateRef.current.canvasHeight = canvasHeight;
  stateRef.current.currentRotation = widget.rotation;
  stateRef.current.currentScale = widgetScale;

  const fnRef = useRef({ updateWidgetPosition, updateWidgetScale, updateWidgetRotation });
  fnRef.current = { updateWidgetPosition, updateWidgetScale, updateWidgetRotation };

  React.useEffect(() => {
    pinchScaleAnim.setValue(widgetScale);
  }, [widgetScale, pinchScaleAnim]);

  React.useEffect(() => {
    if (editMode && !widget.locked) {
      const w = Animated.loop(
        Animated.sequence([
          Animated.timing(wiggleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(wiggleAnim, { toValue: -1, duration: 240, useNativeDriver: true }),
          Animated.timing(wiggleAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
        ])
      );
      wiggleRef.current = w;
      w.start();
    } else {
      if (wiggleRef.current) { wiggleRef.current.stop(); wiggleRef.current = null; }
      wiggleAnim.setValue(0);
    }
  }, [editMode, widget.locked, wiggleAnim]);

  React.useEffect(() => {
    dragStartPos.current = { x: widget.x * canvasWidth, y: widget.y * canvasHeight };
    posX.setValue(widget.x * canvasWidth);
    posY.setValue(widget.y * canvasHeight);
  }, [canvasWidth, canvasHeight, widget.x, widget.y, posX, posY]);

  const clampPosition = useCallback((rawX: number, rawY: number, scale: number) => {
    const s = stateRef.current;
    const base = getWidgetFrameSize(s.widget);
    const halfW = (base.width * scale) / 2;
    const halfH = (base.height * scale) / 2;
    return {
      x: Math.max(halfW, Math.min(s.canvasWidth - halfW, rawX)),
      y: Math.max(halfH, Math.min(s.canvasHeight - halfH, rawY)),
    };
  }, []);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        if (stateRef.current.isRotating) return false;
        return stateRef.current.editMode && !stateRef.current.widget.locked;
      },
      onMoveShouldSetPanResponder: (evt, gs) => {
        if (stateRef.current.isRotating) return false;
        if (!stateRef.current.editMode || stateRef.current.widget.locked) return false;
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length >= 2) return true;
        return Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2;
      },
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          stateRef.current.isPinching = true;
          stateRef.current.pinchStartDist = getDistance(touches as any);
          stateRef.current.pinchStartScale = stateRef.current.currentScale;
          return;
        }
        if (!stateRef.current.editMode || stateRef.current.widget.locked) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        Animated.spring(scaleAnim, { toValue: 1.1, useNativeDriver: true, friction: 8 }).start();
        const s = stateRef.current;
        dragStartPos.current = { x: s.widget.x * s.canvasWidth, y: s.widget.y * s.canvasHeight };
      },
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        const s = stateRef.current;
        if (touches && touches.length >= 2) {
          if (!s.isPinching) {
            s.isPinching = true;
            s.pinchStartDist = getDistance(touches as any);
            s.pinchStartScale = s.currentScale;
            return;
          }
          const dist = getDistance(touches as any);
          if (s.pinchStartDist === 0) return;
          const maxS = getMaxScale(s.widget, s.canvasWidth, s.canvasHeight);
          const ns = Math.max(MIN_SCALE, Math.min(maxS, s.pinchStartScale * (dist / s.pinchStartDist)));
          pinchScaleAnim.setValue(ns);
          s.currentScale = ns;
          return;
        }
        if (s.isPinching || !s.editMode || s.widget.locked) return;
        const clamped = clampPosition(dragStartPos.current.x + gs.dx, dragStartPos.current.y + gs.dy, s.currentScale);
        posX.setValue(clamped.x);
        posY.setValue(clamped.y);
      },
      onPanResponderRelease: (_evt, gs) => {
        const s = stateRef.current;
        if (s.isPinching) {
          s.isPinching = false;
          const maxS = getMaxScale(s.widget, s.canvasWidth, s.canvasHeight);
          const fs = Math.max(MIN_SCALE, Math.min(maxS, s.currentScale));
          fnRef.current.updateWidgetScale(s.widget.id, Math.round(fs * 100) / 100);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          const cpx = s.widget.x * s.canvasWidth;
          const cpy = s.widget.y * s.canvasHeight;
          const cl = clampPosition(cpx, cpy, fs);
          if (cl.x !== cpx || cl.y !== cpy) {
            fnRef.current.updateWidgetPosition(s.widget.id, s.canvasWidth > 0 ? cl.x / s.canvasWidth : 0.5, s.canvasHeight > 0 ? cl.y / s.canvasHeight : 0.5);
          }
          return;
        }
        if (!s.editMode || s.widget.locked) return;
        const clamped = clampPosition(dragStartPos.current.x + gs.dx, dragStartPos.current.y + gs.dy, s.currentScale);
        fnRef.current.updateWidgetPosition(s.widget.id, s.canvasWidth > 0 ? clamped.x / s.canvasWidth : 0.5, s.canvasHeight > 0 ? clamped.y / s.canvasHeight : 0.5);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
      },
      onPanResponderTerminate: () => {
        stateRef.current.isPinching = false;
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
      },
    }),
  [posX, posY, scaleAnim, pinchScaleAnim, clampPosition]);

  const rotatePanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        stateRef.current.isRotating = true;
        stateRef.current.rotationStart = stateRef.current.currentRotation;
        stateRef.current.liveRotation = stateRef.current.currentRotation;
        stateRef.current.widgetCenter = { x: 0, y: 0 };
        const touch = evt.nativeEvent;
        if (wrapperRef.current) {
          wrapperRef.current.measureInWindow((wx: number, wy: number, ww: number, wh: number) => {
            const cx = wx + ww / 2;
            const cy = wy + wh / 2;
            stateRef.current.widgetCenter = { x: cx, y: cy };
            stateRef.current.fingerStartAngle = Math.atan2(touch.pageY - cy, touch.pageX - cx) * (180 / Math.PI);
          });
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      },
      onPanResponderMove: (evt) => {
        const touch = evt.nativeEvent;
        const { x: cx, y: cy } = stateRef.current.widgetCenter;
        if (cx === 0 && cy === 0) return;
        const angle = Math.atan2(touch.pageY - cy, touch.pageX - cx) * (180 / Math.PI);
        const s = stateRef.current;
        const newRot = s.rotationStart + angle - s.fingerStartAngle;
        let next = Math.round(((newRot % 360) + 360) % 360);
        const snapTarget = Math.round(next / ROTATION_SNAP_STEP) * ROTATION_SNAP_STEP;
        if (Math.abs(next - snapTarget) <= ROTATION_SNAP_RANGE) next = snapTarget % 360;
        if (next !== s.liveRotation) {
          const wasSnapped = s.liveRotation !== null && s.liveRotation % ROTATION_SNAP_STEP === 0;
          if (next % ROTATION_SNAP_STEP === 0 && !wasSnapped) playHaptic('rigid');
          s.liveRotation = next;
          setLiveRotation(next);
        }
      },
      onPanResponderRelease: () => {
        const s = stateRef.current;
        s.isRotating = false;
        if (s.liveRotation !== null && s.liveRotation !== s.currentRotation) {
          fnRef.current.updateWidgetRotation(s.widget.id, s.liveRotation);
        }
        s.liveRotation = null;
        setLiveRotation(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      },
      onPanResponderTerminate: () => {
        stateRef.current.isRotating = false;
        stateRef.current.liveRotation = null;
        setLiveRotation(null);
      },
    }),
  []);

  const handleRemove = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    removeWidget(widget.id);
  }, [widget.id, removeWidget]);

  const handleToggleLock = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    toggleWidgetLock(widget.id);
  }, [widget.id, toggleWidgetLock]);

  const handleToggleSlider = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    toggleWidgetSlider(widget.id);
  }, [widget.id, toggleWidgetSlider]);

  const widgetContent = useMemo(() => {
    switch (widget.type) {
      case 'press-hold':
        return <PressHoldWidget disabled={editMode} hapticPower={widget.hapticPower} />;
      case 'scroll-wheel':
        return <ScrollWheelWidget disabled={editMode} hapticPower={widget.hapticPower} />;
      case 'horizontal-scroll':
        return <HorizontalScrollWidget disabled={editMode} hapticPower={widget.hapticPower} />;
      case 'swipe-pad':
        return <SwipePadWidget disabled={editMode} hapticPower={widget.hapticPower} />;
      case 'line':
        return <LineWidget disabled={editMode} hapticPower={widget.hapticPower} lineThickness={widget.lineThickness} hasSlider={widget.hasSlider} drawPoints={widget.drawPoints} drawWidth={widget.drawWidth} drawHeight={widget.drawHeight} />;
      default:
        return null;
    }
  }, [widget.type, widget.hapticPower, widget.lineThickness, widget.hasSlider, widget.drawPoints, widget.drawWidth, widget.drawHeight, editMode]);

  const wiggleRotation = wiggleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [`${rotation - 2}deg`, `${rotation}deg`, `${rotation + 2}deg`],
  });

  const combinedRotation = editMode && !widget.locked && liveRotation === null ? wiggleRotation : `${rotation}deg`;

  return (
    <Animated.View
      ref={wrapperRef as any}
      {...panResponder.panHandlers}
      style={[
        styles.wrapper,
        {
          transform: [
            { translateX: Animated.subtract(posX, frameSize.width / 2) },
            { translateY: Animated.subtract(posY, frameSize.height / 2) },
            { rotate: combinedRotation },
            { scale: Animated.multiply(scaleAnim, pinchScaleAnim) },
          ],
        },
      ]}
    >
      {editMode && (
        <View style={styles.editControls}>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={14} color={theme.white} strokeWidth={3} />
          </TouchableOpacity>
          <View style={styles.rightControls}>
            {widget.type === 'line' && widget.drawPoints && widget.drawPoints.length >= 2 && (
              <TouchableOpacity
                style={[styles.sliderToggleButton, widget.hasSlider && styles.sliderToggleButtonActive]}
                onPress={handleToggleSlider}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CircleDot size={11} color={widget.hasSlider ? theme.accent : theme.textMuted} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.lockButton, widget.locked && styles.lockButtonActive]}
              onPress={handleToggleLock}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {widget.locked ? (
                <Lock size={11} color={theme.accent} strokeWidth={2.5} />
              ) : (
                <Unlock size={11} color={theme.textMuted} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
            {!widget.locked && (
              <Animated.View style={styles.rotateButton} {...rotatePanResponder.panHandlers}>
                <RotateCw size={12} color={theme.accent} strokeWidth={2.5} />
              </Animated.View>
            )}
          </View>
        </View>
      )}
      <View style={[
        styles.widgetContent,
        editMode && styles.widgetContentEdit,
        editMode && widget.locked && styles.widgetContentLocked,
      ]}>
        {widgetContent}
      </View>
    </Animated.View>
  );
}

const WidgetWrapper = React.memo(WidgetWrapperInner);
export default WidgetWrapper;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 10,
  },
  editControls: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightControls: {
    flexDirection: 'row',
    gap: 6,
  },
  lockButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockButtonActive: {
    borderColor: theme.accent,
    backgroundColor: theme.accentGlow,
  },
  rotateButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetContent: {
    borderRadius: 16,
    borderWidth: CONTENT_BORDER,
    borderColor: 'transparent',
    padding: CONTENT_PADDING,
  },
  widgetContentEdit: {
    borderColor: theme.accent,
    borderStyle: 'dashed',
  },
  widgetContentLocked: {
    borderColor: theme.textMuted,
    opacity: 0.7,
  },
  sliderToggleButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderToggleButtonActive: {
    borderColor: theme.accent,
    backgroundColor: theme.accentGlow,
  },
});
