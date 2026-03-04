export type WidgetType = 'press-hold' | 'scroll-wheel' | 'horizontal-scroll' | 'swipe-pad' | 'line';

export type HapticPower = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' | 'success' | 'warning' | 'error' | 'selection';

export type LineThickness = 0.5 | 1 | 1.5 | 2 | 3 | 5 | 8;

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  rotation: number;
  label: string;
  hapticPower?: HapticPower;
  locked?: boolean;
  scale?: number;
  lineThickness?: LineThickness;
  hasSlider?: boolean;
}

export interface WidgetTypeInfo {
  type: WidgetType;
  label: string;
  description: string;
  icon: string;
  defaultSize: { width: number; height: number };
}

export interface SavedFidget {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  favorited: boolean;
  createdAt: number;
  updatedAt: number;
}
