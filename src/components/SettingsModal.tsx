import React, { useEffect } from 'react';
import {
  X,
  Sliders,
  Palette,
  LayoutGrid,
  Search,
  RotateCcw,
  Monitor,
  Keyboard,
  Layers,
} from 'lucide-react';
import { AppSettings } from '../types/opendial';
import { DEFAULT_SEARCH_ENGINES } from '../data/initialData';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onResetDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDefaults,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto font-sans"
    >
      <div
        className="relative w-full max-w-lg bg-[#0f141d] border border-[#20293a] rounded-2xl shadow-2xl overflow-hidden my-8 text-slate-100 animate-in fade-in zoom-in-95 duration-150"
        id="settings-modal-container"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1c2433] bg-[#0c1017]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
              SYSTEM_CONFIGURATION // PREFERENCES
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2230] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* View density */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Interface Density</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">
                CURRENT: {settings.viewDensity?.toUpperCase() || 'STATION'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'station', label: 'Station', desc: 'Standard architectural tile' },
                { id: 'compact', label: 'Compact', desc: 'High-density horizontal row' },
                { id: 'editorial', label: 'Editorial', desc: 'Expansive preview cards' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      viewDensity: mode.id as 'station' | 'compact' | 'editorial',
                    })
                  }
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    (settings.viewDensity || 'station') === mode.id
                      ? 'bg-amber-500/15 border-amber-500/80 text-amber-300'
                      : 'bg-[#141a24] border-[#222a3a] text-slate-300 hover:bg-[#18202c]'
                  }`}
                >
                  <div className="text-xs font-mono font-bold capitalize">{mode.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Theme selector */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Color Atmosphere</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(['dark', 'amoled', 'nord', 'glass', 'light'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, theme: t })}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-medium capitalize border transition-all ${
                    settings.theme === t
                      ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 font-bold'
                      : 'bg-[#141a24] border-[#222a3a] text-slate-300 hover:bg-[#18202c]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Background style */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-amber-400" />
              <span>Grid Canvas Texture</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['mesh', 'gradient', 'minimal', 'custom'] as const).map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, backgroundStyle: bg })}
                  className={`px-3 py-2 rounded-xl text-xs font-mono capitalize border transition-all ${
                    settings.backgroundStyle === bg
                      ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 font-bold'
                      : 'bg-[#141a24] border-[#222a3a] text-slate-300 hover:bg-[#18202c]'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>

            {settings.backgroundStyle === 'custom' && (
              <div className="mt-2.5">
                <input
                  type="text"
                  value={settings.customWallpaperUrl || ''}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, customWallpaperUrl: e.target.value })
                  }
                  placeholder="https://images.unsplash.com/... (Direct Image URL)"
                  className="w-full px-3 py-2 rounded-xl bg-[#141a24] border border-[#222a3a] text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* Grid columns */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                <span>Grid Capacity ({settings.gridColumns} Columns)</span>
              </label>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[4, 5, 6, 7].map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, gridColumns: cols })}
                  className={`px-3 py-2 rounded-xl text-xs font-mono border transition-all ${
                    settings.gridColumns === cols
                      ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 font-bold'
                      : 'bg-[#141a24] border-[#222a3a] text-slate-300 hover:bg-[#18202c]'
                  }`}
                >
                  {cols} Cols
                </button>
              ))}
            </div>
          </div>

          {/* Default search engine */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Default Search Command Engine</span>
            </label>
            <select
              value={settings.defaultSearchEngine}
              onChange={(e) =>
                onUpdateSettings({ ...settings, defaultSearchEngine: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl bg-[#141a24] border border-[#222a3a] text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-500"
            >
              {DEFAULT_SEARCH_ENGINES.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name} ({eng.shortcut})
                </option>
              ))}
            </select>
          </div>

          {/* Preferences */}
          <div className="p-4 rounded-xl bg-[#131924] border border-[#1f2838] space-y-3">
            <div className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
              Control Surfaces & Accelerators
            </div>

            <label className="flex items-center justify-between cursor-pointer text-xs">
              <span className="text-slate-300 flex items-center gap-2">
                <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                <span>Show Quick-Launch Key Badges (1 - 9)</span>
              </span>
              <input
                type="checkbox"
                checked={settings.showKeyShortcuts !== false}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, showKeyShortcuts: e.target.checked })
                }
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-[#0e121a] border-[#2b3548]"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-xs">
              <span className="text-slate-300">Show Command Console Search Bar</span>
              <input
                type="checkbox"
                checked={settings.showSearch}
                onChange={(e) => onUpdateSettings({ ...settings, showSearch: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-[#0e121a] border-[#2b3548]"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-xs">
              <span className="text-slate-300">Show Utility Telemetry Drawer (Notes / Timers)</span>
              <input
                type="checkbox"
                checked={settings.showWidgets}
                onChange={(e) => onUpdateSettings({ ...settings, showWidgets: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-[#0e121a] border-[#2b3548]"
              />
            </label>
          </div>

          {/* Reset button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onResetDefaults}
              className="flex items-center gap-1.5 text-xs font-mono text-rose-400 hover:text-rose-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset all configuration to factory defaults</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3.5 border-t border-[#1c2433] bg-[#0c1017]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold transition-colors shadow-md shadow-amber-500/20"
          >
            CONFIRM & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
