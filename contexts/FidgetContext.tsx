import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { WidgetConfig, WidgetType, HapticPower, LineThickness } from '@/types/fidget';
import { DEFAULT_WIDGETS } from '@/constants/widgets';

const STORAGE_KEY = 'fidget_widgets';

export const [FidgetProvider, useFidget] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<WidgetConfig[][]>([]);

  const pushUndo = useCallback((current: WidgetConfig[]) => {
    setUndoStack(prev => [...prev.slice(-20), current]);
  }, []);

  const widgetsQuery = useQuery({
    queryKey: ['widgets'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as WidgetConfig[];
        return parsed;
      }
      return DEFAULT_WIDGETS;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newWidgets: WidgetConfig[]) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
      return newWidgets;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['widgets'], data);
    },
  });

  useEffect(() => {
    if (widgetsQuery.data) {
      setWidgets(widgetsQuery.data);
    }
  }, [widgetsQuery.data]);

  const updateWidgetPosition = useCallback((id: string, x: number, y: number) => {
    setWidgets(prev => {
      pushUndo(prev);
      const updated = prev.map(w => w.id === id ? { ...w, x, y } : w);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation, pushUndo]);

  const updateWidgetRotation = useCallback((id: string, rotation: number) => {
    setWidgets(prev => {
      pushUndo(prev);
      const updated = prev.map(w => w.id === id ? { ...w, rotation } : w);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation, pushUndo]);

  const addWidget = useCallback((type: WidgetType, options?: { hapticPower?: HapticPower; lineThickness?: LineThickness; hasSlider?: boolean }) => {
    const id = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const labels: Record<WidgetType, string> = {
      'press-hold': 'Press & Hold',
      'scroll-wheel': 'Scroll Wheel',
      'horizontal-scroll': 'Horizontal Scroll',
      'swipe-pad': 'Swipe Pad',
      'line': 'Line',
    };
    const newWidget: WidgetConfig = {
      id,
      type,
      x: 0.5,
      y: 0.5,
      rotation: 0,
      label: labels[type],
      ...(options?.hapticPower ? { hapticPower: options.hapticPower } : {}),
      ...(options?.lineThickness !== undefined ? { lineThickness: options.lineThickness } : {}),
      ...(options?.hasSlider !== undefined ? { hasSlider: options.hasSlider } : {}),
    };
    setWidgets(prev => {
      pushUndo(prev);
      const updated = [...prev, newWidget];
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation, pushUndo]);

  const updateWidgetHapticPower = useCallback((id: string, hapticPower: HapticPower) => {
    setWidgets(prev => {
      pushUndo(prev);
      const updated = prev.map(w => w.id === id ? { ...w, hapticPower } : w);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation, pushUndo]);

  const toggleWidgetLock = useCallback((id: string) => {
    setWidgets(prev => {
      pushUndo(prev);
      const updated = prev.map(w => w.id === id ? { ...w, locked: !w.locked } : w);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation, pushUndo]);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => {
      pushUndo(prev);
      const updated = prev.filter(w => w.id !== id);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation, pushUndo]);

  const clearAllWidgets = useCallback(() => {
    setWidgets(prev => {
      pushUndo(prev);
      return [];
    });
    saveMutation.mutate([]);
  }, [saveMutation, pushUndo]);

  const updateWidgetScale = useCallback((id: string, scale: number) => {
    setWidgets(prev => {
      pushUndo(prev);
      const updated = prev.map(w => w.id === id ? { ...w, scale } : w);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation, pushUndo]);

  const undoLastChange = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setWidgets(last);
      saveMutation.mutate(last);
      return prev.slice(0, -1);
    });
  }, [saveMutation]);

  const clearUndo = useCallback(() => {
    setUndoStack([]);
  }, []);

  const canUndo = undoStack.length > 0;

  const resetWidgets = useCallback(() => {
    setWidgets(prev => {
      pushUndo(prev);
      return DEFAULT_WIDGETS;
    });
    saveMutation.mutate(DEFAULT_WIDGETS);
  }, [saveMutation, pushUndo]);

  const toggleEditMode = useCallback(() => {
    setEditMode(prev => !prev);
  }, []);

  return {
    widgets,
    editMode,
    isLoading: widgetsQuery.isLoading,
    updateWidgetPosition,
    updateWidgetRotation,
    updateWidgetHapticPower,
    updateWidgetScale,
    addWidget,
    removeWidget,
    clearAllWidgets,
    resetWidgets,
    undoLastChange,
    canUndo,
    toggleEditMode,
    toggleWidgetLock,
    clearUndo,
  };
});
