/**
 * OpenDial – The Open-Source, Serverless Speed Dial
 * Zero Centralized Backend | E2EE First (AES-GCM 256-bit) | Pluggable Cloud Sync
 */

import React, { useState, useEffect } from 'react';
import {
  DialItem,
  FolderItem,
  NoteItem,
  AppSettings,
  SyncSettings,
  ExportBackupData,
} from './types/opendial';
import {
  INITIAL_DIALS,
  INITIAL_FOLDERS,
  INITIAL_NOTES,
  INITIAL_SETTINGS,
  INITIAL_SYNC_SETTINGS,
} from './data/initialData';
import { loadFromLocal, saveToLocal, clearAllStorage } from './services/storage';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { DialGrid } from './components/DialGrid';
import { EditDialModal } from './components/EditDialModal';
import { NewFolderModal } from './components/NewFolderModal';
import { WidgetsModal } from './components/WidgetsModal';
import { SyncModal } from './components/SyncModal';
import { ImportExportModal } from './components/ImportExportModal';
import { SettingsModal } from './components/SettingsModal';
import { UnlockModal } from './components/UnlockModal';

export default function App() {
  // Core state with local storage persistence
  const [dials, setDials] = useState<DialItem[]>(() =>
    loadFromLocal<DialItem[]>('dials', INITIAL_DIALS)
  );
  const [folders, setFolders] = useState<FolderItem[]>(() =>
    loadFromLocal<FolderItem[]>('folders', INITIAL_FOLDERS)
  );
  const [notes, setNotes] = useState<NoteItem[]>(() =>
    loadFromLocal<NoteItem[]>('notes', INITIAL_NOTES)
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromLocal<AppSettings>('settings', INITIAL_SETTINGS)
  );
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(() =>
    loadFromLocal<SyncSettings>('sync', INITIAL_SYNC_SETTINGS)
  );
  // The master password is deliberately session-only and is never persisted.
  const [masterPassword, setMasterPassword] = useState('');

  // Active navigation & view state
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Modals state
  const [isEditDialOpen, setIsEditDialOpen] = useState(false);
  const [editingDial, setEditingDial] = useState<DialItem | null>(null);
  const [targetFolderForNewDial, setTargetFolderForNewDial] = useState<string | null>(null);

  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isWidgetsOpen, setIsWidgetsOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);

  // Remove any legacy persisted master password left by earlier releases.
  useEffect(() => {
    localStorage.removeItem(['opendial', 'pwd', 'cache'].join('_'));
  }, []);

  // Synchronize non-secret state changes to LocalStorage
  useEffect(() => {
    saveToLocal('dials', dials);
  }, [dials]);

  useEffect(() => {
    saveToLocal('folders', folders);
  }, [folders]);

  useEffect(() => {
    saveToLocal('notes', notes);
  }, [notes]);

  useEffect(() => {
    saveToLocal('settings', settings);
  }, [settings]);

  useEffect(() => {
    saveToLocal('sync', syncSettings);
  }, [syncSettings]);

  // Current backup state payload
  const currentBackupData: ExportBackupData = {
    version: '1.0.0',
    timestamp: Date.now(),
    appName: 'OpenDial',
    isEncrypted: false,
    dials,
    folders,
    notes,
    settings,
    syncSettings,
  };

  // --- DIAL HANDLERS ---
  const handleSaveDial = (dial: DialItem) => {
    if (editingDial) {
      setDials(dials.map((d) => (d.id === dial.id ? dial : d)));
    } else {
      setDials([dial, ...dials]);
    }
  };

  const handleDeleteDial = (dialId: string) => {
    setDials(dials.filter((d) => d.id !== dialId));
  };

  const handleToggleSpan = (dialId: string) => {
    setDials(
      dials.map((d) => {
        if (d.id === dialId) {
          const newSpan = d.colSpan === 2 ? 1 : 2;
          return { ...d, colSpan: newSpan as 1 | 2 };
        }
        return d;
      })
    );
  };

  const handleRecordClick = (dialId: string) => {
    setDials(
      dials.map((d) => {
        if (d.id === dialId) {
          return { ...d, clicksCount: (d.clicksCount || 0) + 1 };
        }
        return d;
      })
    );
  };

  const handleOpenAddDial = (folderId?: string | null) => {
    setEditingDial(null);
    setTargetFolderForNewDial(folderId !== undefined ? folderId : activeFolderId);
    setIsEditDialOpen(true);
  };

  const handleOpenEditDial = (dial: DialItem) => {
    setEditingDial(dial);
    setTargetFolderForNewDial(dial.folderId || null);
    setIsEditDialOpen(true);
  };

  // --- FOLDER HANDLERS ---
  const handleSaveFolder = (folder: FolderItem) => {
    setFolders([...folders, folder]);
  };

  // --- NOTES HANDLERS ---
  const handleAddNote = (text: string) => {
    const newNote: NoteItem = {
      id: `note_${Date.now()}`,
      text,
      isCompleted: false,
      createdAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
  };

  const handleToggleNote = (id: string) => {
    setNotes(
      notes.map((n) => (n.id === id ? { ...n, isCompleted: !n.isCompleted } : n))
    );
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
  };

  // --- RESTORE DATA ---
  const handleRestoreBackup = (data: ExportBackupData) => {
    if (data.dials) setDials(data.dials);
    if (data.folders) setFolders(data.folders);
    if (data.notes) setNotes(data.notes);
    if (data.settings) setSettings(data.settings);
    if (data.syncSettings) setSyncSettings(data.syncSettings);
  };

  const handleAppendDials = (imported: DialItem[]) => {
    setDials([...imported, ...dials]);
  };

  const handleResetDefaults = () => {
    clearAllStorage();
    setDials(INITIAL_DIALS);
    setFolders(INITIAL_FOLDERS);
    setNotes(INITIAL_NOTES);
    setSettings(INITIAL_SETTINGS);
    setSyncSettings(INITIAL_SYNC_SETTINGS);
    setMasterPassword('');
    setActiveFolderId(null);
    setActiveTagFilter(null);
  };

  // --- BACKGROUND & THEME CLASS ---
  const getThemeClass = () => {
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
  };

  const getBackgroundInlineStyle = (): React.CSSProperties => {
    if (settings.backgroundStyle === 'custom' && settings.customWallpaperUrl) {
      return {
        backgroundImage: `url('${settings.customWallpaperUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    }
    return {};
  };

  return (
    <div
      className={`min-h-screen relative selection:bg-amber-500 selection:text-black transition-colors duration-300 font-sans ${getThemeClass()} ${
        settings.backgroundStyle !== 'custom' ? 'bg-grid-subtle' : ''
      }`}
      style={getBackgroundInlineStyle()}
      id="opendial-app-root"
    >
      {/* Visual Ambient Glows for 'mesh' background style */}
      {settings.backgroundStyle === 'mesh' && !settings.customWallpaperUrl && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[25%] w-[550px] h-[550px] rounded-full bg-amber-500/[0.03] blur-[150px]" />
          <div className="absolute top-[35%] right-[10%] w-[450px] h-[450px] rounded-full bg-cyan-500/[0.03] blur-[160px]" />
        </div>
      )}

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <Navbar
          isProductivityMode={settings.productivityMode}
          onToggleProductivity={() =>
            setSettings({ ...settings, productivityMode: !settings.productivityMode })
          }
          syncSettings={syncSettings}
          viewDensity={settings.viewDensity || 'station'}
          onChangeDensity={(density) =>
            setSettings({ ...settings, viewDensity: density })
          }
          onOpenSync={() => setIsSyncOpen(true)}
          onOpenWidgets={() => setIsWidgetsOpen(true)}
          onOpenAddDial={() => handleOpenAddDial(activeFolderId)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenImportExport={() => setIsImportExportOpen(true)}
          isUnlocked={Boolean(masterPassword)}
          onUnlock={() => setIsUnlockOpen(true)}
          onLock={() => setMasterPassword('')}
        />

        {/* Global Search Bar (Optional based on preferences) */}
        {settings.showSearch && (
          <SearchBar
            currentEngineId={settings.defaultSearchEngine}
            onEngineChange={(engId) =>
              setSettings({ ...settings, defaultSearchEngine: engId })
            }
          />
        )}

        {/* Fluid Dial Grid */}
        <main className="flex-1">
          <DialGrid
            dials={dials}
            folders={folders}
            activeFolderId={activeFolderId}
            activeTagFilter={activeTagFilter}
            gridColumns={settings.gridColumns}
            viewDensity={settings.viewDensity || 'station'}
            showKeyShortcuts={settings.showKeyShortcuts !== false}
            isProductivityMode={settings.productivityMode}
            onSelectFolder={(fId) => setActiveFolderId(fId)}
            onSelectTag={(tag) => setActiveTagFilter(tag)}
            onAddDial={handleOpenAddDial}
            onAddFolder={() => setIsNewFolderOpen(true)}
            onEditDial={handleOpenEditDial}
            onDeleteDial={handleDeleteDial}
            onToggleSpan={handleToggleSpan}
            onRecordClick={handleRecordClick}
          />
        </main>

        {/* Minimal Footer with status */}
        <footer className="w-full py-3.5 text-center text-xs text-slate-500 border-t border-[#18202d] bg-[#070a0f]/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
              <span className="text-amber-400 font-bold">OPENDIAL</span>
              <span className="text-slate-600">/</span>
              <span>CLIENT_ENGINE v1.4.0</span>
              <span className="text-slate-600">/</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SERVERLESS ZERO-KNOWLEDGE
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <button
                onClick={() => setIsImportExportOpen(true)}
                className="text-amber-400 hover:text-amber-300 transition-colors"
              >
                [BUILD EXTENSION .ZIP]
              </button>
              <span className="text-slate-700">|</span>
              <button
                onClick={() => setIsSyncOpen(true)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                SYNC PROTOCOL
              </button>
              <span className="text-slate-700">|</span>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                CONFIG
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* --- MODALS --- */}
      <UnlockModal
        isOpen={isUnlockOpen}
        onClose={() => setIsUnlockOpen(false)}
        onUnlock={(password) => {
          setMasterPassword(password);
          setIsUnlockOpen(false);
        }}
      />

      <EditDialModal
        isOpen={isEditDialOpen}
        onClose={() => setIsEditDialOpen(false)}
        onSave={handleSaveDial}
        initialDial={editingDial}
        folders={folders}
        defaultFolderId={targetFolderForNewDial}
      />

      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onSaveFolder={handleSaveFolder}
      />

      <WidgetsModal
        isOpen={isWidgetsOpen}
        onClose={() => setIsWidgetsOpen(false)}
        notes={notes}
        onAddNote={handleAddNote}
        onToggleNote={handleToggleNote}
        onDeleteNote={handleDeleteNote}
      />

      <SyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        syncSettings={syncSettings}
        onUpdateSyncSettings={setSyncSettings}
        currentBackupData={currentBackupData}
        onRestoreBackupData={handleRestoreBackup}
        masterPassword={masterPassword}
        onRequireUnlock={() => setIsUnlockOpen(true)}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        currentBackupData={currentBackupData}
        onRestoreData={handleRestoreBackup}
        onAppendDials={handleAppendDials}
        masterPassword={masterPassword}
        onRequireUnlock={() => setIsUnlockOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onResetDefaults={handleResetDefaults}
      />
    </div>
  );
}
