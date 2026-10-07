import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SavedFidget, WidgetConfig } from '@/types/fidget';
import { loadSavedFidgets, saveSavedFidgets } from '@/lib/storage';

interface SavedFidgetContextValue {
  fidgets: SavedFidget[];
  isLoading: boolean;
  createFidget: (name: string, widgets: WidgetConfig[], favorited?: boolean) => SavedFidget;
  updateFidget: (id: string, updates: Partial<Pick<SavedFidget, 'name' | 'widgets' | 'favorited'>>) => void;
  deleteFidget: (id: string) => void;
  toggleFavorite: (id: string) => void;
  getFidgetById: (id: string) => SavedFidget | undefined;
}

const SavedFidgetContext = createContext<SavedFidgetContextValue | null>(null);

export function SavedFidgetProvider({ children }: { children: React.ReactNode }) {
  const [fidgets, setFidgets] = useState<SavedFidget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadSavedFidgets().then(loaded => {
      if (cancelled) return;
      setFidgets(loaded);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoading) saveSavedFidgets(fidgets);
  }, [fidgets, isLoading]);

  const createFidget = useCallback((name: string, widgets: WidgetConfig[], favorited = false): SavedFidget => {
    const now = Date.now();
    const fidget: SavedFidget = {
      id: `fidget-${now}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      widgets,
      favorited,
      createdAt: now,
      updatedAt: now,
    };
    setFidgets(prev => [fidget, ...prev]);
    return fidget;
  }, []);

  const updateFidget = useCallback((id: string, updates: Partial<Pick<SavedFidget, 'name' | 'widgets' | 'favorited'>>) => {
    setFidgets(prev => prev.map(f => (f.id === id ? { ...f, ...updates, updatedAt: Date.now() } : f)));
  }, []);

  const deleteFidget = useCallback((id: string) => {
    setFidgets(prev => prev.filter(f => f.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFidgets(prev => prev.map(f => (f.id === id ? { ...f, favorited: !f.favorited, updatedAt: Date.now() } : f)));
  }, []);

  const getFidgetById = useCallback((id: string) => fidgets.find(f => f.id === id), [fidgets]);

  const value = useMemo(() => ({
    fidgets,
    isLoading,
    createFidget,
    updateFidget,
    deleteFidget,
    toggleFavorite,
    getFidgetById,
  }), [fidgets, isLoading, createFidget, updateFidget, deleteFidget, toggleFavorite, getFidgetById]);

  return <SavedFidgetContext.Provider value={value}>{children}</SavedFidgetContext.Provider>;
}

export function useSavedFidgets(): SavedFidgetContextValue {
  const value = useContext(SavedFidgetContext);
  if (!value) throw new Error('useSavedFidgets must be used inside a SavedFidgetProvider');
  return value;
}
