import React, { useState, useEffect } from 'react';
import {
  Compass,
  Lock,
  KeyRound,
  Cloud,
  Clock,
  Plus,
  Sliders,
  FileCode,
  Zap,
  LayoutGrid,
  List,
  Columns,
} from 'lucide-react';
import { SyncSettings } from '../types/opendial';

interface NavbarProps {
  isProductivityMode: boolean;
  onToggleProductivity: () => void;
  syncSettings: SyncSettings;
  viewDensity: 'station' | 'compact' | 'editorial';
  onChangeDensity: (density: 'station' | 'compact' | 'editorial') => void;
  onOpenSync: () => void;
  onOpenWidgets: () => void;
  onOpenAddDial: () => void;
  onOpenSettings: () => void;
  onOpenImportExport: () => void;
  isUnlocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isProductivityMode,
  onToggleProductivity,
  syncSettings,
  viewDensity,
  onChangeDensity,
  onOpenSync,
  onOpenWidgets,
  onOpenAddDial,
  onOpenSettings,
  onOpenImportExport,
  isUnlocked,
  onUnlock,
  onLock,
}) => {
  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setDateString(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).toUpperCase()
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full border-b border-[#202736] bg-[#0c0f16]/90 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-8 py-2.5 mb-6 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#18202f] border border-[#2e3b52] flex items-center justify-center text-amber-400 shadow-inner">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base tracking-tight text-white">
                  OPENDIAL
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#1c2433] border border-[#2a374d] text-slate-300">
                  DECK
                </span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block h-5 w-px bg-[#202736]" />

          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1 rounded-lg bg-[#121620] border border-[#202736] text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono font-semibold text-slate-200 tracking-wider">
              {timeString || '00:00:00'}
            </span>
            <span className="text-slate-500 font-mono text-[11px]">|</span>
            <span className="text-slate-400 font-mono text-[11px] font-medium tracking-wide">
              {dateString}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenSync}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#13201d] hover:bg-[#182a26] border border-emerald-500/30 text-[11px] font-mono text-emerald-400 transition-colors shadow-sm cursor-pointer"
            title="Encrypted locally with AES-GCM 256-bit. Click to configure sync."
          >
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>E2EE·ACTIVE</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-[#121620] border border-[#202736] p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => onChangeDensity('station')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewDensity === 'station'
                  ? 'bg-[#222c3f] text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Station View (Standard Cards)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeDensity('compact')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewDensity === 'compact'
                  ? 'bg-[#222c3f] text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Compact View (High Density)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeDensity('editorial')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewDensity === 'editorial'
                  ? 'bg-[#222c3f] text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Editorial View (Wide Tiles)"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleProductivity}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              isProductivityMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20'
                : 'bg-[#141822] hover:bg-[#1a202c] text-slate-300 border-[#222a3a]'
            }`}
            title="Toggle Focus Mode (Conceals distracting dials)"
          >
            <Zap className={`w-3.5 h-3.5 ${isProductivityMode ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Focus</span>
            {isProductivityMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={isUnlocked ? onLock : onUnlock}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              isUnlocked
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-[#141822] border-[#222a3a] text-slate-300 hover:bg-[#1a202c] hover:text-white'
            }`}
            title={isUnlocked ? 'Lock and clear the master password from memory' : 'Unlock encrypted operations for this session'}
          >
            {isUnlocked ? <Lock className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isUnlocked ? 'Lock' : 'Unlock'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenWidgets}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1a202c] text-slate-300 hover:text-white border border-[#222a3a] text-xs font-medium transition-colors"
            title="Stopwatch, Pomodoro Timer & Quick Notes"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Tools</span>
          </button>

          <button
            type="button"
            onClick={onOpenSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1a202c] text-slate-300 hover:text-white border border-[#222a3a] text-xs font-medium transition-colors"
            title="Personal Cloud Sync (WebDAV / Drive)"
          >
            <Cloud className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline capitalize font-mono text-[11px]">
              {syncSettings.provider === 'webdav'
                ? 'WebDAV'
                : syncSettings.provider === 'gdrive'
                ? 'GDrive'
                : syncSettings.provider === 'onedrive'
                ? 'OneDrive'
                : 'Vault'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenImportExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1a202c] text-slate-300 hover:text-white border border-[#222a3a] text-xs font-medium transition-colors"
            title="Export Manifest V3 Extension & Backups"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden xl:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddDial}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm"
            title="Add Speed Dial (URL, Live, or Multi)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Dial</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-[#141822] hover:bg-[#1a202c] text-slate-300 hover:text-white border border-[#222a3a] transition-colors"
            title="Preferences & Theme"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};