# Storage Migrations

OpenDial uses a versioned storage schema to support forward-compatible evolution of local data structures. This document describes the migration framework and the migrations that have been applied.

## Migration Framework

Migrations run on application startup via the `useSettings` hook. Each migration is a pure function `(data) => data` that transforms a versioned storage object to the next version. The storage layer tracks the current schema version in `localStorage` under the key `opendial_storage_version`.

```typescript
interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate: (data: unknown) => unknown;
}
```

## Migration Registry

| #   | From | To  | Applied | Description                                                              |
| --- | ---- | --- | ------- | ------------------------------------------------------------------------ |
| 1   | 0    | 1   | Yes     | Initial schema establishment (implicit, no migration needed)             |
| 2   | 1    | 2   | Yes     | Backup schema v1.0.0 → v2.0.0 (folders and notes as first-class members) |

## Migration 1: v1.0.0 → v2.0.0

**Context:** The initial backup schema (v1.0.0) did not include `folders` or `notes` as top-level backup members. Version 2.0.0 promotes these to first-class backup entities.

**Transformation:**

- If `folders` is missing, populate with `[]` (empty array).
- If `notes` is missing, populate with `[]` (empty array).
- If `settings` is missing, populate with `INITIAL_SETTINGS`.
- If `syncSettings` is missing, populate with `INITIAL_SYNC_SETTINGS`.
- Bump `version` to `2.0.0`.

**Note:** This migration is handled transparently by `sanitizeImportedBackup()` in `src/services/backup.ts`, which accepts v1.0.0 backups, fills in missing fields with defaults, and normalizes to v2.0.0.

## Applying Migrations

```typescript
// In useSettings (on startup)
const currentVersion = loadFromLocal('storage_version', 0);
if (currentVersion < LATEST_STORAGE_VERSION) {
  const migrated = MIGRATIONS[currentVersion].migrate(rawData);
  saveToLocal('storage_version', migrated.version);
}
```

## Adding a New Migration

1. Add the migration function to `src/services/migrations.ts`.
2. Register it in the `MIGRATIONS` array in the correct order.
3. Increment `LATEST_STORAGE_VERSION`.
4. Add tests in `src/services/migrations.test.ts`.
