import { useState, useEffect, useCallback } from 'react';
import { SyncSettings, SyncCredentials } from '../types/opendial';
import { INITIAL_SYNC_SETTINGS } from '../data/initialData';
import {
  loadSyncSettings,
  loadSyncCredentials,
  saveSyncCredentials,
  clearSyncCredentials,
  saveToLocal,
} from '../services/storage';
import { sanitizeSyncSettings } from '../services/backup';

export function useSync() {
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(() =>
    loadSyncSettings(INITIAL_SYNC_SETTINGS)
  );
  const [syncCredentials, setSyncCredentials] = useState<SyncCredentials>(() =>
    loadSyncCredentials()
  );

  // Synchronize sync settings to local storage (sanitized to remove any leakage)
  useEffect(() => {
    saveToLocal('sync', sanitizeSyncSettings(syncSettings));
  }, [syncSettings]);

  // Synchronize credentials to dedicated storage
  useEffect(() => {
    saveSyncCredentials(syncCredentials);
  }, [syncCredentials]);

  const updateSyncSettings = useCallback((newSettings: SyncSettings) => {
    setSyncSettings(newSettings);
  }, []);

  const updateSyncCredentials = useCallback((newCredentials: SyncCredentials) => {
    setSyncCredentials(newCredentials);
  }, []);

  const resetSync = useCallback(() => {
    setSyncSettings(INITIAL_SYNC_SETTINGS);
    setSyncCredentials({
      webdavPassword: '',
      googleAccessToken: '',
      oneDriveAccessToken: '',
    });
    clearSyncCredentials();
  }, []);

  return {
    syncSettings,
    setSyncSettings,
    updateSyncSettings,
    syncCredentials,
    setSyncCredentials,
    updateSyncCredentials,
    resetSync,
  };
}
