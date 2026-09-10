import { useState, useEffect, useCallback } from 'react';
import { ExportBackupData } from '../types/opendial';
import { INITIAL_SETTINGS, INITIAL_SYNC_SETTINGS } from '../data/initialData';
import {
  LATEST_STORAGE_VERSION,
  getStorageVersion,
  setStorageVersion,
  applyMigrations,
} from '../services/migrations';
import { loadFromLocal, saveToLocal } from '../services/storage';
import { sanitizeImportedBackup } from '../services/backup';

/**
 * Hook that runs storage migrations on app startup.
 *
 * On first run (or when the stored version is behind LATEST_STORAGE_VERSION),
 * this hook loads all persisted data, applies migrations to bring it to the
 * current schema, validates it, and re-persists the migrated data.
 *
 * Subsequent reads from the hooks use the already-migrated localStorage values.
 */
export function useStorageMigrations() {
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  const runMigrations = useCallback(async () => {
    try {
      const currentVersion = getStorageVersion();

      // Already at latest — ensure the version is persisted
      if (currentVersion >= LATEST_STORAGE_VERSION) {
        setStorageVersion(LATEST_STORAGE_VERSION);
        setMigrationComplete(true);
        return;
      }

      // Fresh install (version 0): no data to migrate, just set latest version
      if (currentVersion === 0) {
        setStorageVersion(LATEST_STORAGE_VERSION);
        setMigrationComplete(true);
        return;
      }

      // Load raw persisted data (migration + sanitization will validate types)
      const rawBackup = {
        version: loadFromLocal<string>('backup_schema_version', '1.0.0'),
        timestamp: loadFromLocal<number>('backup_timestamp', Date.now()),
        appName: loadFromLocal<string>('app_name', 'OpenDial'),
        isEncrypted: loadFromLocal<boolean>('is_encrypted', false),
        dials: loadFromLocal<unknown[]>('dials', []),
        folders: loadFromLocal<unknown[]>('folders', []),
        notes: loadFromLocal<unknown[]>('notes', []),
        settings: loadFromLocal<unknown>('settings', INITIAL_SETTINGS),
        syncSettings: loadFromLocal<unknown>('sync', INITIAL_SYNC_SETTINGS),
      } as Partial<ExportBackupData>;

      // Apply migrations
      const { data: migratedData, version: newVersion } = applyMigrations(
        rawBackup,
        currentVersion,
      );

      // Validate the migrated data
      const sanitized = sanitizeImportedBackup(migratedData);

      // Re-persist migrated data
      saveToLocal('dials', sanitized.dials);
      saveToLocal('folders', sanitized.folders);
      saveToLocal('notes', sanitized.notes);
      saveToLocal('settings', sanitized.settings);
      saveToLocal('sync', sanitized.syncSettings);
      saveToLocal('backup_schema_version', sanitized.version);
      saveToLocal('backup_timestamp', sanitized.timestamp);
      setStorageVersion(newVersion);

      setMigrationComplete(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMigrationError(msg);
      setMigrationComplete(true); // Still allow app to proceed with safe defaults
    }
  }, []);

  // Run migrations on mount
  useEffect(() => {
    void runMigrations();
  }, [runMigrations]);

  return { migrationComplete, migrationError };
}
