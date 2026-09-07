import { useState, useCallback } from 'react';
import { DialItem } from '../types/opendial';

export function useModals() {
  // Dial creation & editing
  const [isEditDialOpen, setIsEditDialOpen] = useState(false);
  const [editingDial, setEditingDial] = useState<DialItem | null>(null);
  const [targetFolderForNewDial, setTargetFolderForNewDial] = useState<string | null>(null);

  // Other modal visibility
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isWidgetsOpen, setIsWidgetsOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);

  const openAddDial = useCallback((folderId?: string | null) => {
    setEditingDial(null);
    setTargetFolderForNewDial(folderId ?? null);
    setIsEditDialOpen(true);
  }, []);

  const openEditDial = useCallback((dial: DialItem) => {
    setEditingDial(dial);
    setTargetFolderForNewDial(dial.folderId || null);
    setIsEditDialOpen(true);
  }, []);

  const closeEditDial = useCallback(() => {
    setIsEditDialOpen(false);
    setEditingDial(null);
  }, []);

  const openNewFolder = useCallback(() => setIsNewFolderOpen(true), []);
  const closeNewFolder = useCallback(() => setIsNewFolderOpen(false), []);

  const openWidgets = useCallback(() => setIsWidgetsOpen(true), []);
  const closeWidgets = useCallback(() => setIsWidgetsOpen(false), []);

  const openSync = useCallback(() => setIsSyncOpen(true), []);
  const closeSync = useCallback(() => setIsSyncOpen(false), []);

  const openImportExport = useCallback(() => setIsImportExportOpen(true), []);
  const closeImportExport = useCallback(() => setIsImportExportOpen(false), []);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  const openUnlock = useCallback(() => setIsUnlockOpen(true), []);
  const closeUnlock = useCallback(() => setIsUnlockOpen(false), []);

  return {
    // Edit/Add Dial
    isEditDialOpen,
    editingDial,
    targetFolderForNewDial,
    openAddDial,
    openEditDial,
    closeEditDial,

    // Folder Modal
    isNewFolderOpen,
    openNewFolder,
    closeNewFolder,

    // Widgets Modal
    isWidgetsOpen,
    openWidgets,
    closeWidgets,

    // Sync Modal
    isSyncOpen,
    openSync,
    closeSync,

    // Import/Export Modal
    isImportExportOpen,
    openImportExport,
    closeImportExport,

    // Settings Modal
    isSettingsOpen,
    openSettings,
    closeSettings,

    // Unlock Modal
    isUnlockOpen,
    openUnlock,
    closeUnlock,
  };
}
