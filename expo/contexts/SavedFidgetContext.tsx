import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { SavedFidget, WidgetConfig } from '@/types/fidget';

const STORAGE_KEY = 'saved_fidgets';

export const [SavedFidgetProvider, useSavedFidgets] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [fidgets, setFidgets] = useState<SavedFidget[]>([]);

  const fidgetsQuery = useQuery({
    queryKey: ['saved_fidgets'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as SavedFidget[];
      }
      return [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newFidgets: SavedFidget[]) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newFidgets));
      return newFidgets;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['saved_fidgets'], data);
    },
  });

  useEffect(() => {
    if (fidgetsQuery.data) {
      setFidgets(fidgetsQuery.data);
    }
  }, [fidgetsQuery.data]);

  const createFidget = useCallback((name: string, widgets: WidgetConfig[]): SavedFidget => {
    const now = Date.now();
    const newFidget: SavedFidget = {
      id: `fidget-${now}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      widgets,
      favorited: false,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newFidget, ...fidgets];
    setFidgets(updated);
    saveMutation.mutate(updated);
    return newFidget;
  }, [fidgets, saveMutation]);

  const updateFidget = useCallback((id: string, updates: Partial<Pick<SavedFidget, 'name' | 'widgets' | 'favorited'>>) => {
    setFidgets(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, ...updates, updatedAt: Date.now() } : f);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const deleteFidget = useCallback((id: string) => {
    setFidgets(prev => {
      const updated = prev.filter(f => f.id !== id);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const toggleFavorite = useCallback((id: string) => {
    setFidgets(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, favorited: !f.favorited, updatedAt: Date.now() } : f);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const getFidgetById = useCallback((id: string): SavedFidget | undefined => {
    return fidgets.find(f => f.id === id);
  }, [fidgets]);

  return {
    fidgets,
    isLoading: fidgetsQuery.isLoading,
    createFidget,
    updateFidget,
    deleteFidget,
    toggleFavorite,
    getFidgetById,
  };
});
