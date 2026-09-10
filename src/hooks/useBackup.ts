import { useMemo, useCallback } from 'react';
import {
  DialItem,
  FolderItem,
  NoteItem,
  AppSettings,
  SyncSettings,
  ExportBackupData,
} from '../types/opendial';
import { createPortableBackup, sanitizeImportedBackup } from '../services/backup';
import { clearAllStorage } from '../services/storage';

interface UseBackupOptions {
  dials: DialItem[];
  folders: FolderItem[];
  notes: NoteItem[];
  settings: AppSettings;
  syncSettings: SyncSettings;
  setDials: (dials: DialItem[]) => void;
  setFolders: (folders: FolderItem[]) => void;
  setNotes: (notes: NoteItem[]) => void;
  setSettings: (settings: AppSettings) => void;
  setSyncSettings: (syncSettings: SyncSettings) => void;
  resetVault: () => void;
  resetSync: () => void;
  resetFolders: () => void;
  resetDials: () => void;
  resetNotes: () => void;
  resetSettings: () => void;
}

export function useBackup({
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
}: UseBackupOptions) {
  // Current portable backup state payload (credentials are structurally excluded).
  const currentBackupData: ExportBackupData = useMemo(
    () =>
      createPortableBackup({
        dials,
        folders,
        notes,
        settings,
        syncSettings,
      }),
    [dials, folders, notes, settings, syncSettings],
  );

  const restoreBackup = useCallback(
    (data: ExportBackupData) => {
      const restored = sanitizeImportedBackup(data);
      setDials(restored.dials);
      setFolders(restored.folders);
      setNotes(restored.notes);
      if (restored.settings) {
        setSettings(restored.settings);
      }
      setSyncSettings(restored.syncSettings);
      resetSync();
    },
    [setDials, setFolders, setNotes, setSettings, setSyncSettings, resetSync],
  );

  const resetDefaults = useCallback(() => {
    clearAllStorage();
    resetDials();
    resetFolders();
    resetNotes();
    resetSettings();
    resetSync();
    resetVault();
  }, [resetDials, resetFolders, resetNotes, resetSettings, resetSync, resetVault]);

  return {
    currentBackupData,
    restoreBackup,
    resetDefaults,
  };
}
