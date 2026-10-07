import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { WidgetConfig, WidgetType, HapticPower, LineThickness, DrawPoint } from '@/types/fidget';
import { boardReducer, createBoardState, createDrawnLine, createWidget } from '@/lib/board';

interface FidgetContextValue {
  widgets: WidgetConfig[];
  editMode: boolean;
  canUndo: boolean;
  toggleEditMode: () => void;
  setEditMode: (on: boolean) => void;
  addWidget: (type: WidgetType, options?: { hapticPower?: HapticPower; lineThickness?: LineThickness; hasSlider?: boolean }) => void;
  addDrawnLine: (points: DrawPoint[], drawWidth: number, drawHeight: number, centerX: number, centerY: number, lineThickness: LineThickness, hapticPower?: HapticPower) => void;
  updateWidgetPosition: (id: string, x: number, y: number) => void;
  updateWidgetRotation: (id: string, rotation: number) => void;
  updateWidgetScale: (id: string, scale: number) => void;
  toggleWidgetLock: (id: string) => void;
  toggleWidgetSlider: (id: string) => void;
  removeWidget: (id: string) => void;
  clearAllWidgets: () => void;
  undoLastChange: () => void;
}

const FidgetContext = createContext<FidgetContextValue | null>(null);

interface FidgetProviderProps {
  /** Board contents on mount. Later changes to this prop are ignored; remount with a new key instead. */
  initialWidgets: WidgetConfig[];
  initialEditMode?: boolean;
  /** Called after each change to the board, for persisting it. */
  onChange?: (widgets: WidgetConfig[]) => void;
  children: React.ReactNode;
}

/**
 * One board's widgets, edit mode and undo history. Each screen mounts its own provider,
 * so editing a saved board or creating a new one never touches the Playground.
 */
export function FidgetProvider({ initialWidgets, initialEditMode = false, onChange, children }: FidgetProviderProps) {
  const [state, dispatch] = useReducer(boardReducer, initialWidgets, createBoardState);
  const [editMode, setEditMode] = useState(initialEditMode);

  const onChangeRef = useRef(onChange);
  const lastReportedRef = useRef(state.widgets);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    if (state.widgets === lastReportedRef.current) return;
    lastReportedRef.current = state.widgets;
    onChangeRef.current?.(state.widgets);
  }, [state.widgets]);

  const toggleEditMode = useCallback(() => setEditMode(prev => !prev), []);

  const actions = useMemo<Omit<FidgetContextValue, 'widgets' | 'editMode' | 'canUndo' | 'toggleEditMode' | 'setEditMode'>>(() => ({
    addWidget: (type, options) => dispatch({ type: 'add', widget: createWidget(type, options) }),
    addDrawnLine: (...args) => dispatch({ type: 'add', widget: createDrawnLine(...args) }),
    updateWidgetPosition: (id, x, y) => dispatch({ type: 'update', id, changes: { x, y } }),
    updateWidgetRotation: (id, rotation) => dispatch({ type: 'update', id, changes: { rotation } }),
    updateWidgetScale: (id, scale) => dispatch({ type: 'update', id, changes: { scale } }),
    toggleWidgetLock: (id) => dispatch({ type: 'toggle', id, key: 'locked' }),
    toggleWidgetSlider: (id) => dispatch({ type: 'toggle', id, key: 'hasSlider' }),
    removeWidget: (id) => dispatch({ type: 'remove', id }),
    clearAllWidgets: () => dispatch({ type: 'clear' }),
    undoLastChange: () => dispatch({ type: 'undo' }),
  }), []);

  const value = useMemo<FidgetContextValue>(() => ({
    widgets: state.widgets,
    editMode,
    canUndo: state.past.length > 0,
    toggleEditMode,
    setEditMode,
    ...actions,
  }), [state, editMode, toggleEditMode, actions]);

  return <FidgetContext.Provider value={value}>{children}</FidgetContext.Provider>;
}

export function useFidget(): FidgetContextValue {
  const value = useContext(FidgetContext);
  if (!value) throw new Error('useFidget must be used inside a FidgetProvider');
  return value;
}
