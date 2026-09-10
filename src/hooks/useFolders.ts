import { useState, useEffect, useCallback } from 'react';
import { FolderItem } from '../types/opendial';
import { INITIAL_FOLDERS } from '../data/initialData';
import { loadFromLocal, saveToLocal } from '../services/storage';

export function useFolders() {
  const [folders, setFolders] = useState<FolderItem[]>(() =>
    loadFromLocal<FolderItem[]>('folders', INITIAL_FOLDERS),
  );
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Synchronize folders to local storage
  useEffect(() => {
    saveToLocal('folders', folders);
  }, [folders]);

  const saveFolder = useCallback((folder: FolderItem) => {
    setFolders((prev) => [...prev, folder]);
  }, []);

  const deleteFolder = useCallback(
    (folderId: string, onFolderDeleted?: (folderId: string) => void) => {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setActiveFolderId((current) => (current === folderId ? null : current));
      if (onFolderDeleted) {
        onFolderDeleted(folderId);
      }
    },
    [],
  );

  const resetFolders = useCallback(() => {
    setFolders(INITIAL_FOLDERS);
    setActiveFolderId(null);
    setActiveTagFilter(null);
  }, []);

  return {
    folders,
    setFolders,
    activeFolderId,
    setActiveFolderId,
    activeTagFilter,
    setActiveTagFilter,
    saveFolder,
    deleteFolder,
    resetFolders,
  };
}
