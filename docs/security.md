# Security Model

## Overview

OpenDial implements a **zero-knowledge security model**: your cloud storage provider,
OpenDial's developers, and any network observer cannot read your dials, folders, notes,
or configuration. All sensitive data is encrypted client-side using AES-GCM 256-bit
authenticated encryption before it leaves your browser.

## Cryptographic Design

| Property            | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| **Encryption**      | AES-GCM 256-bit (authenticated encryption)             |
| **Key Derivation**  | PBKDF2-HMAC-SHA-256, 100,000 iterations                |
| **Salt**            | 128-bit, fresh per encryption operation (never reused) |
| **IV**              | 96-bit, fresh per encryption operation                 |
| **Auth Tag**        | 128-bit, appended to ciphertext                        |
| **Key Extractable** | `false` (non-extractable Web Crypto keys)              |

### What Data Is Encrypted

- All dials (URLs, titles, icons, custom thumbnails)
- All folders and their configurations
- All notes
- All app settings (theme, layout, search engines)
- Portable sync configuration (provider URLs, paths — **credentials are never included**)

### What Providers Can Observe

Cloud storage providers (WebDAV, Google Drive, OneDrive) can only see:

- An encrypted blob (ciphertext + metadata envelope)
- File size (within AES-GCM block granularity)
- Upload/download timestamps
- Storage path/filename (`opendial_backup.enc.json`)

They **cannot** see:

- Your dial URLs or titles
- Your master password
- Sync credentials (OAuth tokens, WebDAV passwords)
- Your notes or settings

## Upload Invariant

Every cloud provider enforces:

1. **Requires a non-empty in-memory master password** before proceeding.
2. **Encrypts client-side** using `encryptData()` before constructing the network request.
3. **Sends only the encrypted payload** (versioned envelope with `iv`, `salt`, `ciphertext`).
4. **Never falls back to plaintext** — if no password is provided, upload fails immediately.

## Download Invariant

Every cloud download path:

1. **Rejects plaintext JSON payloads** (`isEncrypted !== true` → rejected with error).
2. **Requires the master password** for decryption — missing password fails before decryption.
3. **Validates the envelope** (version, algorithm parameters, salt/IV lengths, minimum ciphertext length) before attempting decryption.
4. **Decrypts using `decryptData()`** which uses AES-GCM authentication.
5. **Sanitizes via `sanitizeImportedBackup()`** before applying to app state.

## Credential Separation

| Credential Type                | Storage Location                                                | Portable in Backup? |
| ------------------------------ | --------------------------------------------------------------- | ------------------- |
| Master password                | React memory (session-only)                                     | No                  |
| OAuth tokens (Google/OneDrive) | `localStorage` under `opendial_sync_credentials_local_only`     | No                  |
| WebDAV password                | `localStorage` under `opendial_sync_credentials_local_only`     | No                  |
| Sync config (URLs, paths)      | `localStorage` under `opendial_sync`                            | Yes (sanitized)     |
| Dials, folders, notes          | `localStorage` under `opendial_dials`, `opendial_folders`, etc. | Yes                 |
| Thumbnails                     | IndexedDB (`opendial_db`)                                       | Yes (via export)    |

### Key Boundaries

- **Portable config** (`SyncSettings`): provider choice, URLs, usernames, file paths, schedule metadata. Safe to include in backups and extension seeds.
- **Local credentials** (`SyncCredentials`): WebDAV passwords, Google/OneDrive OAuth tokens. Stored under a dedicated local storage key, structurally excluded from all exports, extension seeds, and cloud backup plaintext.
- **Master password**: session-only, never persisted. Cleared on lock/reset/reload.

## Password Handling

1. User enters the master password through the unlock flow.
2. `useVault()` stores it in React state (session memory only).
3. Password is used by sync providers for encrypt/decrypt operations.
4. Password is **never** logged, written to backup, local storage, cloud storage, or the payload.
5. Derived keys are non-extractable Web Crypto objects and are not persisted.
6. On lock or reset, the password is cleared from memory.

### Password-Loss Implications

Losing your master password makes encrypted backups **unrecoverable**. There is no
password reset, no recovery key, and no way to brute-force the encryption. Users are
responsible for remembering their password and keeping plaintext backups in a safe place.

## URL Validation

All imported dial URLs and multi-link URLs are validated to ensure they use `http:`
or `https:` protocols only. `javascript:`, `data:` (non-image), `ftp:`, and other
dangerous protocols are rejected at import time by `validateDialUrl()` in `backup.ts`.

### Iframe Sandboxing

Live dial iframes use the sandbox attribute:
`allow-scripts allow-same-origin allow-forms allow-popups`

This prevents the framed content from:

- Navigating the parent window (`allow-top-navigation` is NOT granted)
- Submitting forms to the parent origin
- Accessing cookies or localStorage of the parent origin

### External Link Handling

All external links opened from dials use `rel="noopener noreferrer"` to prevent
`window.opener` access and tabnabbing attacks.

## Backup Schema Security

- **Version 1.0.0** (legacy): Initial schema without folders/notes as first-class members.
- **Version 2.0.0** (current): Adds folders, notes as first-class backup members.

All imports are validated against the current schema. Legacy 1.0.0 backups are accepted
but migrated to 2.0.0. Unknown or future versions are rejected. Every field is validated
with type checking, enum allowlists, and structural validation.

See `docs/migrations.md` for migration details.

## Encryption Failure Behavior

Wrong passwords, tampered ciphertext, malformed payloads, unsupported envelopes,
and invalid JSON all produce the same generic error:
`Decryption failed. Check the password and backup integrity.`

This prevents oracle attacks where an attacker could learn whether a password is
correct by observing different error messages.
