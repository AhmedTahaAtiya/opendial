import assert from 'node:assert/strict';
import test from 'node:test';
import { LATEST_STORAGE_VERSION, MIGRATIONS, applyMigrations } from './migrations';

test('LATEST_STORAGE_VERSION is 2', () => {
  assert.equal(LATEST_STORAGE_VERSION, 2);
});

test('MIGRATION from v1 to v2 exists', () => {
  assert.ok(MIGRATIONS[1], 'Migration for v1 should exist');
  assert.equal(MIGRATIONS[1].fromVersion, 1);
  assert.equal(MIGRATIONS[1].toVersion, 2);
});

test('applyMigrations is a no-op when already at latest version', () => {
  const data = { version: '2.0.0', dials: [] };
  const result = applyMigrations(data, 2);
  assert.equal(result.version, 2);
  assert.deepEqual(result.data, data);
});

test('applyMigrations converts v1 data to v2 schema', () => {
  const v1Data = {
    version: '1.0.0',
    timestamp: 1000,
    appName: 'OpenDial',
    isEncrypted: false,
    dials: [
      { id: 'd1', title: 'Test', url: 'https://example.com', type: 'standard', createdAt: 1 },
    ],
    // folders and notes missing in v1
  };
  const { data, version } = applyMigrations(v1Data, 1);
  assert.equal(version, 2);
  const migrated = data as Record<string, unknown>;
  assert.equal(migrated.version, '2.0.0');
  assert.equal(migrated.appName, 'OpenDial');
  assert.deepEqual(migrated.folders, []);
  assert.deepEqual(migrated.notes, []);
  assert.ok(Array.isArray(migrated.dials));
});

test('applyMigrations preserves existing folders and notes', () => {
  const v1Data = {
    version: '1.0.0',
    timestamp: 1000,
    appName: 'OpenDial',
    isEncrypted: false,
    dials: [],
    folders: [{ id: 'f1', title: 'Work', createdAt: 100 }],
    notes: [{ id: 'n1', text: 'Buy milk', isCompleted: false, createdAt: 100 }],
  };
  const { data, version } = applyMigrations(v1Data, 1);
  assert.equal(version, 2);
  const migrated = data as Record<string, unknown>;
  assert.deepEqual(migrated.folders, [{ id: 'f1', title: 'Work', createdAt: 100 }]);
  assert.deepEqual(migrated.notes, [
    { id: 'n1', text: 'Buy milk', isCompleted: false, createdAt: 100 },
  ]);
});

test('applyMigrations throws when no migration path exists', () => {
  // Simulate a missing migration by temporarily overriding
  const original = MIGRATIONS[1];
  delete MIGRATIONS[1];
  try {
    assert.throws(() => applyMigrations({}, 1), /No migration found for storage version 1/);
  } finally {
    MIGRATIONS[1] = original;
  }
});
