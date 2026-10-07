import { WidgetTypeInfo } from '@/types/fidget';

export const WIDGET_TYPES: WidgetTypeInfo[] = [
  {
    type: 'press-hold',
    label: 'Press & Hold',
    description: 'Escalating haptic like the iOS flashlight button',
    icon: 'Circle',
    defaultSize: { width: 100, height: 100 },
  },
  {
    type: 'scroll-wheel',
    label: 'Scroll Wheel',
    description: 'Rotary dial with satisfying tick feedback',
    icon: 'RotateCw',
    defaultSize: { width: 140, height: 140 },
  },
  {
    type: 'horizontal-scroll',
    label: 'Horizontal Scroll',
    description: 'Slide left and right with ticking haptic clicks',
    icon: 'GripHorizontal',
    defaultSize: { width: 160, height: 64 },
  },
  {
    type: 'swipe-pad',
    label: 'Swipe Pad',
    description: 'Directional swipe with increasing vibration',
    icon: 'Move',
    defaultSize: { width: 140, height: 140 },
  },
  {
    type: 'line',
    label: 'Line',
    description: 'Freely draw a line and optionally add a slider button',
    icon: 'Minus',
    defaultSize: { width: 200, height: 20 },
  },
];

export const DEFAULT_WIDGETS = [
  {
    id: 'default-press-1',
    type: 'press-hold' as const,
    x: 0.5,
    y: 0.35,
    rotation: 0,
    label: 'Press & Hold',
  },
  {
    id: 'default-scroll-1',
    type: 'scroll-wheel' as const,
    x: 0.25,
    y: 0.6,
    rotation: 0,
    label: 'Scroll Wheel',
  },
  {
    id: 'default-swipe-1',
    type: 'swipe-pad' as const,
    x: 0.75,
    y: 0.6,
    rotation: 0,
    label: 'Swipe Pad',
  },
];
