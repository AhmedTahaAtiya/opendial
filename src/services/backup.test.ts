import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { INITIAL_SETTINGS, INITIAL_SYNC_SETTINGS } from '../data/initialData';
import { decryptData } from './crypto';
import { BACKUP_SCHEMA_VERSION, createPortableBackup, sanitizeImportedBackup } from './backup';
import { generateExtensionZip } from './extensionExporter';
import {
  GoogleDriveSyncProvider,
  OneDriveSyncProvider,
  WebDAVSyncProvider,
} from './sync';
import type { ExportBackupData } from '../types/opendial';

const secrets = {
  webdav: 'webdav-secret',
  google: 'google-secret',
  oneDrive: 'onedrive-secret',
};

function legacyBackup(): ExportBackupData {
  return {
    version: '1.0.0',
    timestamp: 1,
    appName: 'OpenDial',
    isEncrypted: false,
    dials: [],
    folders: [],
    notes: [],
    settings: INITIAL_SETTINGS,
    syncSettings: {
      ...INITIAL_SYNC_SETTINGS,
      provider: 'gdrive',
      webdav: { ...INITIAL_SYNC_SETTINGS.webdav, password: secrets.webdav },
      gdrive: { ...INITIAL_SYNC_SETTINGS.gdrive, accessToken: secrets.google },
      onedrive: { ...INITIAL_SYNC_SETTINGS.onedrive, accessToken: secrets.oneDrive },
    },
  } as ExportBackupData;
}

function assertCredentialFree(value: unknown) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, /accessToken|webdavPassword|googleAccessToken|oneDriveAccessToken/);
  assert.doesNotMatch(serialized, /"password"/);
  for (const secret of Object.values(secrets)) assert.ok(!serialized.includes(secret));
}

test('portable backup construction omits all provider credentials', () => {
  const source = legacyBackup();
  const backup = createPortableBackup({
    dials: source.dials,
    folders: source.folders,
    notes: source.notes,
    settings: source.settings,
    syncSettings: source.syncSettings,
  });
  assertCredentialFree(backup);
  assert.equal(backup.syncSettings.provider, 'gdrive');
  assert.equal(backup.syncSettings.gdrive.folderName, 'OpenDial');
});

test('legacy imports cannot inject credentials and require re-authentication', () => {
  const restored = sanitizeImportedBackup(legacyBackup());
  assertCredentialFree(restored);
  assert.equal(restored.syncSettings.webdav.requiresAuthentication, true);
  assert.equal(restored.syncSettings.gdrive.requiresAuthentication, true);
  assert.equal(restored.syncSettings.onedrive.requiresAuthentication, true);
});

test('accepts and normalizes supported legacy and current versions', () => {
  const legacy = sanitizeImportedBackup({ version: '1.0.0', dials: [] });
  assert.equal(legacy.version, BACKUP_SCHEMA_VERSION);
  assert.deepEqual(legacy.folders, []);
  assert.deepEqual(legacy.settings, INITIAL_SETTINGS);

  const current = sanitizeImportedBackup({ ...legacyBackup(), version: BACKUP_SCHEMA_VERSION });
  assert.equal(current.version, BACKUP_SCHEMA_VERSION);
});

test('rejects malformed roots and missing or invalid versions', () => {
  for (const value of [null, [], 'backup', 3]) {
    assert.throws(() => sanitizeImportedBackup(value), /payload must be an object/);
  }
  assert.throws(() => sanitizeImportedBackup({ dials: [] }), /version must be a string/);
  assert.throws(() => sanitizeImportedBackup({ version: 2, dials: [] }), /version must be a string/);
  assert.throws(() => sanitizeImportedBackup({ version: 'v2', dials: [] }), /semantic version format/);
});

test('rejects unknown and future backup versions', () => {
  assert.throws(() => sanitizeImportedBackup({ version: '1.5.0', dials: [] }), /Unsupported backup version/);
  assert.throws(() => sanitizeImportedBackup({ version: '3.0.0', dials: [] }), /Unsupported backup version/);
});

test('rejects malformed nested application values', () => {
  const base = legacyBackup();
  const dial = {
    id: 'dial-1', title: 'Dial', url: 'https://example.com', type: 'multipage', createdAt: 1,
    multiLinks: [{ id: 'link-1', title: 'Link', url: 'https://example.com/link' }],
  };
  assert.throws(
    () => sanitizeImportedBackup({ ...base, dials: [{ ...dial, multiLinks: [{ ...dial.multiLinks[0], url: 7 }] }] }),
    /dials\[0\]\.multiLinks\[0\]\.url must be a string/
  );
  assert.throws(() => sanitizeImportedBackup({ ...base, folders: [{ id: 'f', title: 4, createdAt: 1 }] }), /folders\[0\]\.title/);
  assert.throws(() => sanitizeImportedBackup({ ...base, notes: [{ id: 'n', text: 'x', isCompleted: 'no', createdAt: 1 }] }), /notes\[0\]\.isCompleted/);
  assert.throws(() => sanitizeImportedBackup({ ...base, settings: { ...base.settings, theme: 'invalid' } }), /settings\.theme/);
  assert.throws(() => sanitizeImportedBackup({ ...base, syncSettings: { ...base.syncSettings, enabled: 'yes' } }), /syncSettings\.enabled/);
  assert.throws(() => sanitizeImportedBackup({ ...base, syncSettings: { ...base.syncSettings, webdav: { ...base.syncSettings.webdav, path: 9 } } }), /syncSettings\.webdav\.path/);
});

test('extension config seed omits legacy credentials', async () => {
  const blob = await generateExtensionZip(legacyBackup());
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const seed = await zip.file('config_seed.json')!.async('string');
  assertCredentialFree(JSON.parse(seed));
});

test('cloud plaintext is sanitized before encryption for every provider', async () => {
  const originalFetch = globalThis.fetch;
  const bodies: string[] = [];
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    bodies.push(String(init?.body || ''));
    return new Response('{}', { status: 200 });
  }) as typeof fetch;

  try {
    const backup = legacyBackup();
    const password = 'correct horse battery staple';
    await new WebDAVSyncProvider(INITIAL_SYNC_SETTINGS.webdav, secrets.webdav).upload(backup, password);
    await new GoogleDriveSyncProvider(INITIAL_SYNC_SETTINGS.gdrive, secrets.google).upload(backup, password);
    await new OneDriveSyncProvider(INITIAL_SYNC_SETTINGS.onedrive, secrets.oneDrive).upload(backup, password);

    assert.equal(bodies.length, 3);
    const envelopes = [
      JSON.parse(bodies[0]),
      JSON.parse(bodies[1].match(/Content-Type: application\/json\r\n\r\n(\{.*\})\r\n--/s)![1]),
      JSON.parse(bodies[2]),
    ];
    for (const envelope of envelopes) {
      const plaintext = await decryptData<ExportBackupData>(envelope, password);
      assertCredentialFree(plaintext);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects dial URL with invalid protocol (javascript:)', () => {
  const base = legacyBackup();
  assert.throws(
    () => sanitizeImportedBackup({ ...base, dials: [{ id: 'd1', title: 'Dial', url: 'javascript:alert(1)', type: 'standard', createdAt: 1 }] }),
    /dials\[0\]\.url must be a valid HTTP\/HTTPS URL/
  );
});

test('rejects dial URL with invalid protocol (data:) when not image', () => {
  const base = legacyBackup();
  assert.throws(
    () => sanitizeImportedBackup({ ...base, dials: [{ id: 'd1', title: 'Dial', url: 'data:text/html,<script>alert(1)</script>', type: 'standard', createdAt: 1 }] }),
    /dials\[0\]\.url must be a valid HTTP\/HTTPS URL/
  );
});

test('accepts valid HTTPS URL for dial', () => {
  const base = legacyBackup();
  const restored = sanitizeImportedBackup({
    ...base,
    dials: [{ id: 'd1', title: 'Test', url: 'https://example.com/page', type: 'standard', createdAt: 1 }],
  });
  assert.equal(restored.dials[0].url, 'https://example.com/page');
});

test('rejects multi-link URL with invalid protocol', () => {
  const base = legacyBackup();
  assert.throws(
    () => sanitizeImportedBackup({ ...base, dials: [{ 
      id: 'd1', title: 'Dial', url: 'https://example.com', type: 'multipage', createdAt: 1,
      multiLinks: [{ id: 'l1', title: 'Link', url: 'ftp://evil.com' }]
    }] }),
    /dials\[0\]\.multiLinks\[0\]\.url must be a valid HTTP\/HTTPS URL/
  );
});

test('accepts valid multi-link URLs', () => {
  const base = legacyBackup();
  const restored = sanitizeImportedBackup({
    ...base,
    dials: [{ 
      id: 'd1', title: 'Dial', url: 'https://example.com', type: 'multipage', createdAt: 1,
      multiLinks: [{ id: 'l1', title: 'Link', url: 'https://example.com/link' }]
    }],
  });
  assert.equal(restored.dials[0].multiLinks![0].url, 'https://example.com/link');
});
