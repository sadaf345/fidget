export type WidgetType = 'press-hold' | 'scroll-wheel' | 'horizontal-scroll' | 'swipe-pad';

export type HapticPower = 'light' | 'medium' | 'heavy';

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
