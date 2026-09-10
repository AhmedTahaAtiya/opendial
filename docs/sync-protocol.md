# Sync Protocol

## Overview

OpenDial's sync protocol enables encrypted, conflict-aware synchronization of user data
between local storage and cloud providers (WebDAV, Google Drive, OneDrive). The protocol
is **push-pull**: the client downloads the latest remote backup, resolves conflicts,
merges with local state, then uploads the combined result.

All network traffic is encrypted end-to-end. Cloud providers cannot read user data.

## Architecture

```
┌──────────────────────────────────────────────────┐
│              OpenDial Client                     │
│                                                  │
│  ┌─────────────┐  ┌─────────────────────┐       │
│  │  useSync    │  │  SyncCoordinator    │       │
│  │  (hook)     │  │  (singleton)        │       │
│  └──────┬──────┘  └──────────┬──────────┘       │
│         │                    │                  │
│         │  withSyncGuards    │                  │
│         │  (timeout=8s,     │  retry=3x        │
│         │   backoff=1s)     │  (exponential)   │
│         │                    │                  │
│  ┌──────┴────────────────────┴──────┐           │
│  │  Encrypt Backup (AES-GCM-256)    │           │
│  │  → EncryptedPayload Envelope     │           │
│  └───────────────────────────────────┘           │
│         │                    │                    │
│         │ Upload/Download   │                    │
│         │ (HTTPS)            │                    │
│         ▼                    ▼                    │
│  ┌────────────────────┐ ┌─────────────────┐    │
│  │  WebDAV Provider    │ │  Drive Provider │    │
│  │  (Nextcloud, etc.) │ │  (Google/OneDrive)│   │
│  └────────────────────┘ └─────────────────┘    │
│                                                  │
│  ┌────────────────────────────────────────────┐   │
│  │  Decrypt ← Master Password ← Vault        │   │
│  │  (useVault, session-only)                  │   │
│  └────────────────────────────────────────────┘   │
│                                                  │
│  ┌────────────────────────────────────────────┐   │
│  │  mergeRemoteBackup()                       │   │
│  │  (conflict resolution)                     │   │
│  └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

## Encrypted Payload Envelope

All sync data is wrapped in an `EncryptedPayload` envelope:

```typescript
interface EncryptedPayload {
  version: '2.0.0'; // Backup schema version
  encrypted: true; // Mandatory flag for validation
  isEncrypted: true; // Redundant safety check
  alg: 'AES-GCM'; // Algorithm identifier
  keyDerivation: {
    algorithm: 'PBKDF2';
    iterations: 100000;
  };
  iv: string; // Base64-encoded 96-bit IV
  salt: string; // Base64-encoded 128-bit salt
  ciphertext: string; // Base64-encoded AES-GCM ciphertext + auth tag
}
```

The plaintext `ExportBackupData` is encrypted to produce this envelope. The envelope
is the only thing transmitted to or stored by cloud providers.

## Sync States

The sync lifecycle has these states, managed by the `useSync` hook and reported
through `SyncProviderContext`:

| State         | Description                                   |
| ------------- | --------------------------------------------- |
| `idle`        | No sync in progress                           |
| `uploading`   | Pushing local backup to cloud                 |
| `downloading` | Fetching remote backup from cloud             |
| `merging`     | Resolving conflicts between local and remote  |
| `completed`   | Sync finished successfully                    |
| `error`       | Sync failed (network, auth, decryption, etc.) |

### Error Codes

Sync failures produce structured `SyncError` objects with machine-readable codes:

| Code         | Meaning                                        | Retry?                    |
| ------------ | ---------------------------------------------- | ------------------------- |
| `timeout`    | Request exceeded 8-second timeout              | Yes (exponential backoff) |
| `network`    | Network unreachable, DNS failure, HTTP error   | Yes                       |
| `auth`       | Authentication failed (bad token, 401, 403)    | No (requires re-auth)     |
| `conflict`   | Unresolvable sync conflict                     | No (requires user input)  |
| `decryption` | Wrong password or corrupted ciphertext         | No                        |
| `corruption` | Remote payload failed structural validation    | No                        |
| `provider`   | Provider-specific error (e.g., quota exceeded) | Depends                   |

## Retry Policy

Network operations are wrapped by `withSyncGuards()`:

1. **Timeout**: 8 seconds per request (`AbortSignal.timeout(8000)`)
2. **Retries**: Up to 3 attempts with 1-second exponential backoff
3. **Backoff**: 1s → 2s → 4s between attempts
4. **Abort handling**: If the abort signal fires, the operation is terminated without retry
5. **Non-retryable errors**: `auth`, `conflict`, `decryption`, `corruption` errors abort immediately

```typescript
async function withSyncGuards<T>(
  op: (signal: AbortSignal) => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T>;
```

## Upload Flow

```
User triggers sync
    ↓
useSync hook
    ↓
1. Check password in vault (fail → error: decryption)
2. Encrypt ExportBackupData → EncryptedPayload
    ↓
3. withSyncGuards → provider.upload(payload, password)
    ↓
4. Provider sends encrypted payload over HTTPS
    ↓
5. On success → sync status = completed
   On timeout → retry (up to 3x with backoff)
   On auth error → sync status = error: auth
```

### Provider-Specific Upload Details

- **WebDAV**: PUT request to `{baseUrl}/{path}/opendial_backup.enc.json`
  with `Authorization: Bearer {token}` or Basic auth header
- **Google Drive**: Multipart upload via Drive API v3
  (`uploadType=resumable`), file MIME type `application/json`
- **OneDrive**: PUT request to OneDrive REST API upload session URL

## Download & Conflict Resolution Flow

```
useSync hook triggers download
    ↓
1. withSyncGuards → provider.download(password)
    ↓
2. Provider fetches encrypted payload over HTTPS
    ↓
3. validateRemotePayload():
   - Check isEncrypted === true (reject plaintext)
   - Structural validation (version, algorithm, IV/salt length)
    ↓
4. Decrypt with AES-GCM + PBKDF2(password, salt, 100k)
   - On wrong password → error: decryption
   - On tampered ciphertext → error: decryption (auth tag fails)
    ↓
5. sanitizeImportedBackup() → validate + normalize schema
    ↓
6. mergeRemoteBackup(remote, local):
   - Compare timestamps
   - Local wins for same-timestamp conflicts
   - Remote-only dials are merged in
    ↓
7. Apply merged result to app state (dials, folders, notes)
```

### mergeRemoteBackup Conflict Rules

| Scenario                              | Resolution                                             |
| ------------------------------------- | ------------------------------------------------------ |
| Remote backup is newer                | Merge remote-only dials into local, keep local changes |
| Local state is newer                  | Keep local, skip remote merge                          |
| Same timestamp                        | Local wins (user's current session takes priority)     |
| Remote dial ID exists locally         | Local version is kept (no overwrite)                   |
| Remote dial ID does NOT exist locally | Remote dial is added to local state                    |

This is a **last-write-wins with local priority** merge strategy. The remote backup
is treated as a secondary source; the user's currently-running session always wins
for conflicts on the same entity.

## Sync Scheduling

Users can configure automatic sync intervals via `useSync`. The default is manual-only.
Available intervals:

- `manual` (default) — sync only on user action
- `5min` — every 5 minutes
- `15min` — every 15 minutes
- `30min` — every 30 minutes
- `hourly` — every hour
- `daily` — once per day

Scheduled syncs use the same upload-first-then-download pattern. If the user has
unsynced local changes, an upload is triggered before attempting a download.

## Security Invariants

1. **Encryption before transit**: Data is encrypted client-side before any network call.
2. **Password never leaves device**: Master password is session-only; never sent to cloud.
3. **Credentials never in backup**: OAuth tokens and WebDAV passwords are structurally excluded.
4. **Download rejects plaintext**: Remote payloads without `isEncrypted === true` are rejected.
5. **Key non-extractability**: Web Crypto keys are created with `extractable: false`.
6. **Generic error messages**: Decryption failures return the same error regardless of cause.

## Provider Interface

All sync providers implement `ISyncProvider`:

```typescript
interface ISyncProvider {
  name: string;
  testConnection(): Promise<{ ok: boolean; message: string }>;
  upload(data: ExportBackupData, password?: string): Promise<SyncStatus>;
  download(password?: string): Promise<SyncResult>;
  deleteBackup(): Promise<boolean>;
}
```

Available providers:

- `WebDAVProvider` (port 443 or custom)
- `GoogleDriveProvider` (OAuth2)
- `OneDriveProvider` (OAuth2)
- `LocalFileProvider` (manual import/export, no network)
