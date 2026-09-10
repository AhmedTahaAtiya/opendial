# Architecture, Security Model, and Threat Model

## 1. System Architecture

OpenDial is a **client-side only** Progressive Web App (PWA) built with React 19 + Vite 6 + Tailwind CSS 4. It runs entirely in the browser — no backend servers, no accounts, no telemetry.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Runtime                       │
│                                                             │
│  ┌─────────────────┐   ┌─────────────────────────────────┐  │
│  │   UI Console    │   │      Web Crypto API Engine      │  │
│  │ (React 19 + V4) │   │   AES-GCM 256-bit + PBKDF2      │  │
│  └────────┬────────┘   └────────────────┬────────────────┘  │
│           │                             │                   │
│           ▼                             ▼                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            Local Storage / IndexedDB Cache            │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │
               (Encrypted Ciphertext Payload)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Your Personal Storage                    │
│        (Nextcloud / WebDAV / Google Drive / Local ZIP)      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User interacts** with UI → React hooks (`useDials`, `useFolders`, `useNotes`, `useSettings`, `useSync`, `useVault`) manage state.
2. **State persistence** → React state is mirrored to `localStorage` (via `saveToLocal`/`loadFromLocal`) and thumbnails are cached in IndexedDB.
3. **Backup creation** → `useBackup` hook calls `createPortableBackup()` which strips all provider credentials and produces a portable `ExportBackupData` object.
4. **Encryption** → `crypto.ts` encrypts the backup using AES-GCM 256-bit with PBKDF2 key derivation (100,000 iterations, 128-bit salt, 96-bit IV).
5. **Upload** → Sync providers (`sync.ts`) encrypt client-side and upload only ciphertext to the user's personal storage.
6. **Download** → Sync providers download encrypted payloads, reject plaintext, and decrypt client-side using the in-memory master password.

### Key Modules

| Module                                 | Responsibility                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `src/types/opendial.ts`                | All TypeScript type definitions                                               |
| `src/data/initialData.ts`              | Initial state: empty dials, default settings, search engines                  |
| `src/services/crypto.ts`               | AES-GCM 256-bit encryption, PBKDF2 key derivation, password strength checking |
| `src/services/backup.ts`               | Backup schema validation, sanitization, portable backup creation              |
| `src/services/storage.ts`              | localStorage + IndexedDB abstraction, credential separation                   |
| `src/services/sync.ts`                 | Pluggable sync providers (WebDAV, Google Drive, OneDrive, Local)              |
| `src/services/extensionExporter.ts`    | Generates self-contained browser extension ZIP                                |
| `src/services/weather.ts`              | Open-Meteo weather API integration (zero tracking)                            |
| `src/services/audio.ts`                | Web Audio API alarm chime synthesis                                           |
| `src/hooks/*.ts`                       | React hooks for state management                                              |
| `src/components/*.tsx`                 | React UI components                                                           |
| `src/components/dials/*.tsx`           | Specialized dial card renderers (standard, live, multipage, weather, folder)  |
| `src/components/dials/DialActions.tsx` | Contextual action menu for dials                                              |
| `scripts/build-extension.mjs`          | Production build script for browser extension                                 |

### Storage Architecture

```
Browser Storage (same-origin, NOT a secure vault):
├── opendial_dials            → DialItem[] (user data)
├── opendial_folders          → FolderItem[]
├── opendial_notes            → NoteItem[]
├── opendial_settings         → AppSettings
├── opendial_sync             → SyncSettings (portable config, no secrets)
├── opendial_sync_credentials_local_only  → SyncCredentials (non-portable secrets)
└── opendial_db (IndexedDB)   → Thumbnail blobs (thumbnails store)

Browser Memory (ephemeral, cleared on reload/lock):
└── masterPassword            → RuntimeSyncSettings password for E2E encryption
```

### Extension Architecture

The browser extension is built via `scripts/build-extension.mjs` and `extensionExporter.ts`. It is fully self-contained:

- **No external CDN dependencies** — all assets are bundled locally.
- **No runtime API keys** — `config_seed.json` contains only sanitized, portable config.
- **Manifest V3** with zero unnecessary permissions (`tabs`, `bookmarks`, `storage`, `contextualIdentities` are all absent).
- **CSP**: `script-src 'self'; object-src 'none'; base-uri 'none'`
- Works offline — local data persists via browser localStorage/IndexedDB.

## 2. Security Model

### Zero-Knowledge Principle

OpenDial implements a **zero-knowledge architecture**: the application server (i.e., your cloud storage provider) never possesses the plaintext keys or data to decrypt your backup. All encryption happens client-side before data leaves the browser.

### Cryptographic Design

| Property            | Value                                      |
| ------------------- | ------------------------------------------ |
| **Encryption**      | AES-GCM 256-bit (authenticated encryption) |
| **Key Derivation**  | PBKDF2-HMAC-SHA-256, 100,000 iterations    |
| **Salt**            | 128-bit, fresh per encryption operation    |
| **IV**              | 96-bit, fresh per encryption operation     |
| **Auth Tag**        | 128-bit, appended to ciphertext            |
| **Key extractable** | `false` (non-extractable Web Crypto keys)  |

#### Key Properties

1. **Fresh salt + IV per operation** — identical passwords and plaintexts produce different ciphertexts.
2. **Non-extractable keys** — derived keys cannot be exported from Web Crypto, limiting exfiltration.
3. **Password never persisted** — held only in React memory, cleared on lock/reset/reload.
4. **Uniform failure messages** — wrong passwords, tampered ciphertext, malformed payloads, and invalid JSON all produce the same error: `"Decryption failed. Check the password and backup integrity."` This prevents oracle attacks.

### Cloud Upload Invariant

Every cloud provider (WebDAV, Google Drive, OneDrive, Local) enforces:

1. Requires a non-empty in-memory master password before proceeding.
2. Encrypts data client-side using `encryptData()` before constructing the network request body.
3. Sends only the encrypted payload (versioned envelope with `iv`, `salt`, `ciphertext`).
4. Never falls back to plaintext.

### Cloud Download Invariant

Every cloud download path:

1. Rejects plaintext JSON payloads (`isEncrypted !== true` → rejected).
2. Requires the master password for decryption.
3. Decrypts using `decryptData()` which validates the envelope version, algorithm parameters, salt/IV lengths, and minimum ciphertext length before attempting decryption.
4. Sanitizes the decrypted data via `sanitizeImportedBackup()` before applying to app state.

### Credential Separation

- **Portable config** (`SyncSettings`): provider choice, URLs, usernames, file paths, schedule metadata. Stored in `localStorage` under `opendial_sync`. Safe to include in backups and extension seeds.
- **Local credentials** (`SyncCredentials`): WebDAV passwords, Google/OneDrive OAuth tokens. Stored under a dedicated `opendial_sync_credentials_local_only` key, structurally excluded from all exports, extension seeds, and cloud backup plaintext.
- **Master password**: session-only, never persisted.

### URL Validation

All imported dial URLs and multi-link URLs are validated to ensure they use `http:` or `https:` protocols only. `javascript:`, `data:` (non-image), `ftp:`, and other dangerous protocols are rejected.

### Backup Schema

- **Version 1.0.0** (legacy): Initial schema.
- **Version 2.0.0** (current): Adds folders, notes as first-class backup members.

All imports are validated against the current schema. Legacy 1.0.0 backups are accepted but migrated to 2.0.0. Unknown or future versions are rejected. Every field is validated with type checking, enum allowlists, and length constraints.

## 3. Threat Model and Limitations

### What This Protects Against

| Threat                                  | Protection                                               |
| --------------------------------------- | -------------------------------------------------------- |
| Curious storage provider                | AES-GCM ciphertext is unintelligible                     |
| Stolen cloud files                      | Ciphertext requires the master password to decrypt       |
| Undetected ciphertext modification      | AES-GCM authentication tag detects tampering             |
| Identical password reuse across backups | Fresh salt per operation prevents identical derived keys |
| Deterministic ciphertext detection      | Fresh IV per operation prevents pattern analysis         |
| Credential leakage in exports           | Structured sanitization strips all provider secrets      |
| Protocol handler injection              | URL allowlist enforces HTTP/HTTPS only                   |
| Extension privilege escalation          | MV3 manifest with zero unnecessary permissions           |

### What This Does NOT Protect Against

| Threat                            | Why                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Unlocked browser session          | Master password is in memory; page can access it                             |
| Compromised device/browser        | Malware can read memory, keystrokes, local storage                           |
| Malicious code in origin          | Same-origin JavaScript can access localStorage and in-memory data            |
| Screen/key logging                | No defense against OS-level capture                                          |
| Weak passwords                    | PBKDF2 is not memory-hard; offline brute-force is possible                   |
| Traffic metadata                  | Provider, timing, and file size are visible to network observers             |
| Local credentials in localStorage | Browser local storage is not a secure vault; same-origin scripts can read it |
| Rollback attacks                  | An attacker with file access can restore an older encrypted backup           |
| Denial of service                 | No defense against data deletion or corruption                               |

### Risk Mitigations

- **Browser local storage is not a secure vault.** Credentials are separated from portable config to prevent accidental serialization, but a compromised runtime can still read them. Users should use a browser extension or OS-level password manager for additional credential isolation.
- **PBKDF2 is not memory-hard.** The iteration count is encoded in the payload for future migration to argon2 or scrypt. Users should use strong, unique master passwords.
- **TLS is required** for all cloud operations to protect credentials and ciphertext in transit.
- **Regular backups** of the encrypted vault file are recommended. Losing the master password makes encrypted backups unrecoverable.

## 4. Data Flow Diagrams

### Session Unlock Flow

```
User enters master password
    ↓
useVault() stores password in React memory (session-only)
    ↓
Password used by sync provider for encrypt/decrypt operations
    ↓
Password NEVER written to localStorage, cloud, or backup payload
```

### Cloud Upload Flow

```
User clicks "Sync Now (Upload)"
    ↓
SyncModal → createSyncProvider(config)
    ↓
Provider.upload(backupData, masterPassword)
    │ (missing password → early rejection)
    ↓
encryptData(sanitizeImportedBackup(backupData), password)
    │ (strips credentials, produces versioned AES-GCM envelope)
    ↓
fetch(cloudAPI, { method: 'PUT', body: JSON.stringify(envelope) })
    ↓
Only ciphertext reaches the cloud
```

### Cloud Download Flow

```
User clicks "Restore from Cloud"
    ↓
SyncModal → createSyncProvider(config)
    ↓
Provider.download(masterPassword)
    │ (missing password → early rejection for encrypted download)
    ↓
fetch(cloudAPI, { method: 'GET' })
    ↓
Check payload.isEncrypted === true
    │ (plaintext → rejected)
    ↓
decryptData(payload, password)
    │ (envelope validation → AES-GCM decrypt → JSON.parse)
    │ (any failure → uniform "Decryption failed" error)
    ↓
sanitizeImportedBackup(decrypted)
    │ (full schema validation + credential stripping)
    ↓
onRestoreBackupData(sanitized) → app state updated
    ↓
resetSync() → provider credentials cleared (require re-authentication)
```
