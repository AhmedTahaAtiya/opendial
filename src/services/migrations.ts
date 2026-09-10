/**
 * Storage Migration Framework
 *
 * Versioned migrations for forward-compatible evolution of local data.
 * Each migration is a pure function that transforms data from one schema
 * version to the next. Migrations run sequentially on application startup.
 */

import { INITIAL_SETTINGS, INITIAL_SYNC_SETTINGS } from '../data/initialData';
import type {
  ExportBackupData,
  DialItem,
  FolderItem,
  NoteItem,
  AppSettings,
  SyncSettings,
} from '../types/opendial';

/** Current storage schema version. Increment when adding a migration. */
export const LATEST_STORAGE_VERSION = 2;

export interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate: (data: unknown) => unknown;
}

const MIGRATION_VERSION_KEY = 'opendial_storage_version';

function _migrateToV1(data: unknown): unknown {
  // V1 is the initial schema — no transformation needed.
  // This is a no-op identity migration for registry completeness.
  return data;
}

function migrateToV2(data: unknown): ExportBackupData {
  const source = (data || {}) as Partial<ExportBackupData>;
  return {
    version: '2.0.0',
    timestamp: source.timestamp ?? Date.now(),
    appName: source.appName ?? 'OpenDial',
    isEncrypted: source.isEncrypted ?? false,
    dials: (source.dials ?? []) as DialItem[],
    folders: (source.folders ?? []) as FolderItem[],
    notes: (source.notes ?? []) as NoteItem[],
    settings: (source.settings ?? INITIAL_SETTINGS) as AppSettings,
    syncSettings: (source.syncSettings ?? INITIAL_SYNC_SETTINGS) as SyncSettings,
  };
}

/**
 * Ordered migration registry. Migrations are keyed by the source version.
 * To add a migration: add a new entry mapping the *from* version to the migrator.
 */
export const MIGRATIONS: Record<number, Migration> = {
  1: { fromVersion: 1, toVersion: 2, migrate: migrateToV2 },
};

/**
 * Walk migrations from the current version to the latest, applying each
 * in sequence. Returns the migrated data and the new version number.
 */
export function applyMigrations(
  data: unknown,
  fromVersion: number,
): { data: unknown; version: number } {
  let current: unknown = data;
  let version = fromVersion;

  while (version < LATEST_STORAGE_VERSION) {
    const migration = MIGRATIONS[version];
    if (!migration) {
      throw new Error(`No migration found for storage version ${version}`);
    }
    if (migration.fromVersion !== version || migration.toVersion !== version + 1) {
      throw new Error(
        `Migration gap: version ${version} expects from=${migration.fromVersion}, to=${migration.toVersion}`,
      );
    }
    current = migration.migrate(current);
    version = migration.toVersion;
  }

  return { data: current, version };
}

/** Read the stored schema version from localStorage. */
export function getStorageVersion(): number {
  try {
    const stored = localStorage.getItem(MIGRATION_VERSION_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

/** Persist the current schema version to localStorage. */
export function setStorageVersion(version: number): void {
  try {
    localStorage.setItem(MIGRATION_VERSION_KEY, String(version));
  } catch {
    // ignore — version tracking is best-effort
  }
}
