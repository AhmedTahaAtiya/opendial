import React, { useState, useEffect, useCallback } from 'react';
import { AppSettings, ViewDensity } from '../types/opendial';
import { INITIAL_SETTINGS } from '../data/initialData';
import { loadFromLocal, saveToLocal } from '../services/storage';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromLocal<AppSettings>('settings', INITIAL_SETTINGS),
  );

  // Synchronize settings to local storage
  useEffect(() => {
    saveToLocal('settings', settings);
  }, [settings]);

  const updateSettings = useCallback((newOrPartial: Partial<AppSettings> | AppSettings) => {
    setSettings((prev) => ({ ...prev, ...newOrPartial }));
  }, []);

  const toggleProductivity = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      productivityMode: !prev.productivityMode,
    }));
  }, []);

  const changeDensity = useCallback((density: ViewDensity) => {
    setSettings((prev) => ({
      ...prev,
      viewDensity: density,
    }));
  }, []);

  const changeSearchEngine = useCallback((engineId: string) => {
    setSettings((prev) => ({
      ...prev,
      defaultSearchEngine: engineId,
    }));
  }, []);

  const getThemeClass = useCallback((): string => {
    switch (settings.theme) {
      case 'amoled':
        return 'bg-black text-slate-100';
      case 'nord':
        return 'bg-[#242933] text-[#eceff4]';
      case 'light':
        return 'bg-[#f4f6f9] text-slate-900';
      case 'glass':
        return 'bg-[#080b11] text-slate-100';
      case 'dark':
      default:
        return 'bg-[#090d14] text-slate-100';
    }
  }, [settings.theme]);

  const getBackgroundInlineStyle = useCallback((): React.CSSProperties => {
    if (settings.backgroundStyle === 'custom' && settings.customWallpaperUrl) {
      return {
        backgroundImage: `url('${settings.customWallpaperUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    }
    return {};
  }, [settings.backgroundStyle, settings.customWallpaperUrl]);

  const resetSettings = useCallback(() => {
    setSettings(INITIAL_SETTINGS);
  }, []);

  return {
    settings,
    setSettings,
    updateSettings,
    toggleProductivity,
    changeDensity,
    changeSearchEngine,
    getThemeClass,
    getBackgroundInlineStyle,
    resetSettings,
  };
}
