# OpenDial encryption design

## Cloud invariant

WebDAV, Google Drive, and OneDrive uploads accept backup objects internally but require a non-empty in-memory master password, encrypt before constructing the network request body, and send only the encrypted envelope. Missing passwords stop before `fetch`. Cloud downloads reject plaintext JSON and never fall back to treating it as backup data. The legacy `SyncSettings.e2eeEnabled` value is retained only for persisted-settings compatibility and is forced to `true` when settings are saved; provider code does not trust it.

All providers (WebDAV, Google Drive, OneDrive, and local file export) require a non-empty in-memory master password, encrypt the backup before writing, and never fall back to plaintext. Missing passwords stop before the file is written. All downloads reject plaintext payloads and require the master password for decryption.

## Version 1 payload

```json
{
  "version": "1",
  "isEncrypted": true,
  "kdf": {
    "name": "PBKDF2",
    "hash": "SHA-256",
    "iterations": 100000,
    "salt": "base64(16 random bytes)"
  },
  "cipher": {
    "name": "AES-GCM",
    "keyLength": 256,
    "iv": "base64(12 random bytes)",
    "tagLength": 128
  },
  "ciphertext": "base64(ciphertext || authentication tag)"
}
```

The explicit version and algorithm parameters allow validation and future format migration. The salt and IV are public parameters, not secrets.

## Encryption workflow

1. Serialize the backup as UTF-8 JSON.
2. Generate a fresh 128-bit salt with `crypto.getRandomValues`.
3. Generate a fresh 96-bit AES-GCM IV independently with `crypto.getRandomValues`.
4. Import the UTF-8 password into Web Crypto and derive a non-extractable 256-bit AES key using PBKDF2-HMAC-SHA-256 with 100,000 iterations and that operation's salt.
5. Encrypt with AES-256-GCM and a 128-bit authentication tag.
6. Base64-encode binary fields and serialize the versioned envelope. Password and key are not included.

## Decryption and failure behavior

The decoder validates the envelope version, algorithms, numeric parameters, salt/IV lengths, and minimum authenticated-ciphertext length. It derives the key from the supplied password and payload salt, then asks AES-GCM to authenticate and decrypt before parsing JSON. Wrong passwords, modified ciphertext/tag, malformed payloads, unsupported envelopes, and invalid plaintext JSON all produce the same safe message: `Decryption failed. Check the password and backup integrity.` No plaintext fallback occurs.

## Password and provider credential lifecycle

The master password is entered through the session unlock flow, held only in React memory, cleared on lock/reset/reload, and never logged, written to a backup, local storage, cloud storage, or the payload. Derived keys are non-extractable Web Crypto objects and are not persisted. Losing the password makes encrypted backups unrecoverable.

OAuth access tokens and the WebDAV password are runtime, local-only credentials. They are stored under a dedicated local storage key, separate from portable sync configuration. Browser local storage is **not a secure credential vault**: same-origin script or a compromised browser profile can read it. The separation prevents accidental serialization into normal application data, plaintext exports, extension seeds, and encrypted cloud-backup plaintext; it does not protect a compromised runtime.

Portable sync configuration includes provider choice, WebDAV URL/username/path, cloud folder/file names, and schedule metadata. Backup schema 2.0.0 never contains provider credentials. Every import path allowlists portable fields, discards credential-shaped legacy fields, marks all cloud providers as requiring authentication, and clears existing local provider credentials. Users must re-enter credentials after every restore; sync resumes normally afterward.

## Threat model and limitations

This protects backup confidentiality and integrity against a curious or compromised storage provider, stolen cloud files, and undetected ciphertext modification. Random salt prevents identical passwords from yielding the same derived key across operations; random IV prevents deterministic AES-GCM output.

It does not protect an unlocked browser session, a compromised device/browser/extension, malicious code running in the origin, screen/key logging, weak-password offline guessing, traffic metadata (provider, timing, file size), local-only credentials readable by same-origin code, denial of service, rollback to an older valid encrypted backup, or loss of the password. PBKDF2 iteration cost is encoded for migration but is not memory-hard. TLS remains required to protect cloud credentials and transport metadata.
