/**
 * OpenDial – The Open-Source, Serverless Speed Dial
 * Zero Centralized Backend | E2EE First (AES-GCM 256-bit) | Pluggable Cloud Sync
 */

import React from 'react';
import { useDials } from './hooks/useDials';
import { useFolders } from './hooks/useFolders';
import { useNotes } from './hooks/useNotes';
import { useSettings } from './hooks/useSettings';
import { useSync } from './hooks/useSync';
import { useVault } from './hooks/useVault';
import { useModals } from './hooks/useModals';
import { useBackup } from './hooks/useBackup';

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
  const {
    dials,
    setDials,
    saveDial,
    deleteDial,
    toggleSpan,
    recordClick,
    appendDials,
    orphanFolderDials,
    resetDials,
  } = useDials();

  const {
    folders,
    setFolders,
    activeFolderId,
    setActiveFolderId,
    activeTagFilter,
    setActiveTagFilter,
    saveFolder,
    deleteFolder,
    resetFolders,
  } = useFolders();

  const {
    notes,
    setNotes,
    addNote,
    toggleNote,
    deleteNote,
    resetNotes,
  } = useNotes();

  const {
    settings,
    setSettings,
    toggleProductivity,
    changeDensity,
    changeSearchEngine,
    getThemeClass,
    getBackgroundInlineStyle,
    resetSettings,
  } = useSettings();

  const {
    syncSettings,
    setSyncSettings,
    syncCredentials,
    setSyncCredentials,
    resetSync,
  } = useSync();

  const {
    masterPassword,
    isUnlocked,
    unlock,
    lock,
    resetVault,
  } = useVault();

  const {
    isEditDialOpen,
    editingDial,
    targetFolderForNewDial,
    openAddDial,
    openEditDial,
    closeEditDial,
    isNewFolderOpen,
    openNewFolder,
    closeNewFolder,
    isWidgetsOpen,
    openWidgets,
    closeWidgets,
    isSyncOpen,
    openSync,
    closeSync,
    isImportExportOpen,
    openImportExport,
    closeImportExport,
    isSettingsOpen,
    openSettings,
    closeSettings,
    isUnlockOpen,
    openUnlock,
    closeUnlock,
  } = useModals();

  const { currentBackupData, restoreBackup, resetDefaults } = useBackup({
    dials,
    folders,
    notes,
    settings,
    syncSettings,
    setDials,
    setFolders,
    setNotes,
    setSettings,
    setSyncSettings,
    resetVault,
    resetSync,
    resetFolders,
    resetDials,
    resetNotes,
    resetSettings,
  });

  // Orchestrated deletion: removes folder, resets active view if needed, and moves dials to root
  const handleDeleteFolder = (folderId: string) => {
    deleteFolder(folderId, orphanFolderDials);
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
          onToggleProductivity={toggleProductivity}
          syncSettings={syncSettings}
          viewDensity={settings.viewDensity || 'station'}
          onChangeDensity={changeDensity}
          onOpenSync={openSync}
          onOpenWidgets={openWidgets}
          onOpenAddDial={() => openAddDial(activeFolderId)}
          onOpenSettings={openSettings}
          onOpenImportExport={openImportExport}
          isUnlocked={isUnlocked}
          onUnlock={openUnlock}
          onLock={lock}
        />

        {/* Global Search Bar (Optional based on preferences) */}
        {settings.showSearch && (
          <SearchBar
            currentEngineId={settings.defaultSearchEngine}
            onEngineChange={changeSearchEngine}
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
            onAddDial={openAddDial}
            onAddFolder={openNewFolder}
            onDeleteFolder={handleDeleteFolder}
            onEditDial={openEditDial}
            onDeleteDial={deleteDial}
            onToggleSpan={toggleSpan}
            onRecordClick={recordClick}
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
                onClick={openImportExport}
                className="text-amber-400 hover:text-amber-300 transition-colors"
              >
                [BUILD EXTENSION .ZIP]
              </button>
              <span className="text-slate-700">|</span>
              <button
                onClick={openSync}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                SYNC PROTOCOL
              </button>
              <span className="text-slate-700">|</span>
              <button
                onClick={openSettings}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                CONFIG
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <UnlockModal
        isOpen={isUnlockOpen}
        onClose={closeUnlock}
        onUnlock={(password) => {
          unlock(password);
          closeUnlock();
        }}
      />

      <EditDialModal
        isOpen={isEditDialOpen}
        onClose={closeEditDial}
        onSave={saveDial}
        initialDial={editingDial}
        folders={folders}
        defaultFolderId={targetFolderForNewDial}
      />

      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={closeNewFolder}
        onSaveFolder={saveFolder}
      />

      <WidgetsModal
        isOpen={isWidgetsOpen}
        onClose={closeWidgets}
        notes={notes}
        onAddNote={addNote}
        onToggleNote={toggleNote}
        onDeleteNote={deleteNote}
      />

      <SyncModal
        isOpen={isSyncOpen}
        onClose={closeSync}
        syncSettings={syncSettings}
        syncCredentials={syncCredentials}
        onUpdateSyncSettings={setSyncSettings}
        onUpdateSyncCredentials={setSyncCredentials}
        currentBackupData={currentBackupData}
        onRestoreBackupData={restoreBackup}
        masterPassword={masterPassword}
        onRequireUnlock={openUnlock}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={closeImportExport}
        currentBackupData={currentBackupData}
        onRestoreData={restoreBackup}
        onAppendDials={appendDials}
        masterPassword={masterPassword}
        onRequireUnlock={openUnlock}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        settings={settings}
        onUpdateSettings={setSettings}
        onResetDefaults={resetDefaults}
      />
    </div>
  );
}
