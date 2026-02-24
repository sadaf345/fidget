import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { WidgetConfig, WidgetType, HapticPower } from '@/types/fidget';
import { DEFAULT_WIDGETS } from '@/constants/widgets';

const STORAGE_KEY = 'fidget_widgets';

export const [FidgetProvider, useFidget] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState<boolean>(false);

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
      const updated = prev.map(w => w.id === id ? { ...w, x, y } : w);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const updateWidgetRotation = useCallback((id: string, rotation: number) => {
    setWidgets(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, rotation } : w);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const addWidget = useCallback((type: WidgetType, options?: { hapticPower?: HapticPower }) => {
    const id = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const labels: Record<WidgetType, string> = {
      'press-hold': 'Press & Hold',
      'scroll-wheel': 'Scroll Wheel',
      'horizontal-scroll': 'Horizontal Scroll',
      'swipe-pad': 'Swipe Pad',
    };
    const newWidget: WidgetConfig = {
      id,
      type,
      x: 0.5,
      y: 0.5,
      rotation: 0,
      label: labels[type],
      ...(options?.hapticPower ? { hapticPower: options.hapticPower } : {}),
    };
    setWidgets(prev => {
      const updated = [...prev, newWidget];
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const updateWidgetHapticPower = useCallback((id: string, hapticPower: HapticPower) => {
    setWidgets(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, hapticPower } : w);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const toggleWidgetLock = useCallback((id: string) => {
    setWidgets(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, locked: !w.locked } : w);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => {
      const updated = prev.filter(w => w.id !== id);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const clearAllWidgets = useCallback(() => {
    setWidgets([]);
    saveMutation.mutate([]);
  }, [saveMutation]);

  const updateWidgetScale = useCallback((id: string, scale: number) => {
    setWidgets(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, scale } : w);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const resetWidgets = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    saveMutation.mutate(DEFAULT_WIDGETS);
  }, [saveMutation]);

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
    toggleEditMode,
    toggleWidgetLock,
  };
});
