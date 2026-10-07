import { WidgetConfig, WidgetType, HapticPower, LineThickness, DrawPoint } from '@/types/fidget';

export const MAX_UNDO = 30;

export const WIDGET_LABELS: Record<WidgetType, string> = {
  'press-hold': 'Press & Hold',
  'scroll-wheel': 'Scroll Wheel',
  'horizontal-scroll': 'Horizontal Scroll',
  'swipe-pad': 'Swipe Pad',
  'line': 'Line',
};

export interface BoardState {
  widgets: WidgetConfig[];
  past: WidgetConfig[][];
}

export type BoardAction =
  | { type: 'add'; widget: WidgetConfig }
  | { type: 'update'; id: string; changes: Partial<WidgetConfig> }
  | { type: 'toggle'; id: string; key: 'locked' | 'hasSlider' }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'undo' };

export function createBoardState(widgets: WidgetConfig[]): BoardState {
  return { widgets, past: [] };
}

function applyAction(widgets: WidgetConfig[], action: Exclude<BoardAction, { type: 'undo' }>): WidgetConfig[] {
  switch (action.type) {
    case 'add':
      return [...widgets, action.widget];
    case 'update': {
      const target = widgets.find(w => w.id === action.id);
      if (!target) return widgets;
      const changed = (Object.keys(action.changes) as (keyof WidgetConfig)[])
        .some(key => target[key] !== action.changes[key]);
      if (!changed) return widgets;
      return widgets.map(w => (w.id === action.id ? { ...w, ...action.changes } : w));
    }
    case 'toggle':
      return widgets.map(w => (w.id === action.id ? { ...w, [action.key]: !w[action.key] } : w));
    case 'remove':
      return widgets.some(w => w.id === action.id) ? widgets.filter(w => w.id !== action.id) : widgets;
    case 'clear':
      return widgets.length === 0 ? widgets : [];
  }
}

// Every change that actually alters the board records one undo step; no-op changes record nothing.
export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  if (action.type === 'undo') {
    if (state.past.length === 0) return state;
    return { widgets: state.past[state.past.length - 1], past: state.past.slice(0, -1) };
  }
  const widgets = applyAction(state.widgets, action);
  if (widgets === state.widgets) return state;
  return { widgets, past: [...state.past, state.widgets].slice(-MAX_UNDO) };
}

function newWidgetId(): string {
  return `widget-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createWidget(
  type: WidgetType,
  options?: { hapticPower?: HapticPower; lineThickness?: LineThickness; hasSlider?: boolean },
): WidgetConfig {
  return {
    id: newWidgetId(),
    type,
    x: 0.5,
    y: 0.5,
    rotation: 0,
    label: WIDGET_LABELS[type],
    ...(options?.hapticPower ? { hapticPower: options.hapticPower } : {}),
    ...(options?.lineThickness !== undefined ? { lineThickness: options.lineThickness } : {}),
    ...(options?.hasSlider !== undefined ? { hasSlider: options.hasSlider } : {}),
  };
}

export function createDrawnLine(
  points: DrawPoint[],
  drawWidth: number,
  drawHeight: number,
  centerX: number,
  centerY: number,
  lineThickness: LineThickness,
  hapticPower: HapticPower = 'medium',
): WidgetConfig {
  return {
    id: newWidgetId(),
    type: 'line',
    x: centerX,
    y: centerY,
    rotation: 0,
    label: WIDGET_LABELS.line,
    lineThickness,
    hapticPower,
    hasSlider: true,
    drawPoints: points,
    drawWidth,
    drawHeight,
  };
}
