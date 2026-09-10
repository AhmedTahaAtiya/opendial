# Threat Model

## System Overview

OpenDial is a client-side dial pad (speed-dial) web application built with TypeScript
and React. Users manage dials, folders, and notes, and optionally sync encrypted
backups to their own cloud storage (WebDAV, Google Drive, OneDrive).

## Assets

| Asset                          | Sensitivity                                            |
| ------------------------------ | ------------------------------------------------------ |
| Dial URLs and titles           | Medium — reveals browsing habits and identity          |
| Notes content                  | High — may contain secrets, credentials, personal info |
| Master password                | Critical — decrypts all backups                        |
| OAuth tokens (Google/OneDrive) | Critical — full cloud account access                   |
| WebDAV password                | High — server and storage access                       |
| Custom thumbnails              | Low — visual personalization                           |
| App settings                   | Low — layout, theme, search engines                    |

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                   Browser (Trusted)                     │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  App State   │  │  Vault   │  │  IndexedDB       │  │
│  │  (React)     │  │  (pass)  │  │  (thumbnails)    │  │
│  └──────┬───────┘  └────┬─────┘  └────────┬─────────┘  │
│         │               │                 │             │
│         │  encrypt/decrypt (AES-GCM 256)  │             │
│         │               │                 │             │
│         │         ┌─────┴─────┐           │             │
│         │         │  Payload  │           │             │
│         │         │  (ciphertext)│          │             │
└────────┼─────────┴──────────┴───────────┘                 │
         │                                                   │
         │  Network (Untrusted)                              │
┌────────┼──────────────────────────────────────────────────┐│
│  Cloud │  Provider (untrusted, can observe traffic)       ││
│  Storage│  - WebDAV (Nextcloud, etc.)                   ││
│         │  - Google Drive                                ││
│         │  - OneDrive                                    ││
└────────┴──────────────────────────────────────────────────┘│
┌─────────────────────────────────────────────────────────┐│
│  Extension / Portable Config (untrusted distribution)   ││
└─────────────────────────────────────────────────────────┘│
```

### Key Boundaries

1. **Browser ↔ Network**: Encryption boundary. Data is encrypted before leaving the browser.
2. **App State ↔ Vault**: Password boundary. Master password is session-only, never persisted.
3. **Portable Config ↔ Local Credentials**: Structural boundary. Credentials are structurally
   excluded from any portable output.

## Attack Scenarios

### AS-1: Cloud Provider Inspects Backup

| Field               | Detail                                                                |
| ------------------- | --------------------------------------------------------------------- |
| **Threat**          | Cloud storage provider inspects uploaded backup content               |
| **Affected Assets** | All encrypted dial data, notes, settings                              |
| **Risk Level**      | Low (mitigated)                                                       |
| **Mitigation**      | End-to-end encryption with AES-GCM-256. Provider only sees ciphertext |
| **Residual Risk**   | File size, timestamps, and storage location are observable            |

### AS-2: Man-in-the-Middle on Sync

| Field               | Detail                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| **Threat**          | Network attacker intercepts or modifies sync traffic                    |
| **Affected Assets** | Backup payloads in transit                                              |
| **Risk Level**      | Low (mitigated)                                                         |
| **Mitigation**      | HTTPS for all cloud APIs. AES-GCM authentication tag prevents tampering |
| **Residual Risk**   | DNS rebinding, certificate authority compromise                         |

### AS-3: Malicious Portable Config

| Field               | Detail                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **Threat**          | Attacker crafts a portable backup/config with injected credentials                             |
| **Affected Assets** | User's cloud account credentials                                                               |
| **Risk Level**      | Low (mitigated)                                                                                |
| **Mitigation**      | `sanitizeImportedBackup()` strips all credential fields. `isEncrypted` check rejects plaintext |
| **Residual Risk**   | Social engineering to accept crafted config                                                    |

### AS-4: Malicious Dial URL

| Field               | Detail                                                         |
| ------------------- | -------------------------------------------------------------- |
| **Threat**          | Imported dial URL uses dangerous protocol (javascript:, data:) |
| **Affected Assets** | User's browser session, cookies                                |
| **Risk Level**      | Medium (mitigated)                                             |
| **Mitigation**      | `validateDialUrl()` restricts to http/https only               |
| **Residual Risk**   | Phishing via HTTPS URLs                                        |

### AS-5: Tabnabbing via External Link

| Field               | Detail                                                                    |
| ------------------- | ------------------------------------------------------------------------- |
| **Threat**          | A dial's external link uses `window.opener` to manipulate the parent page |
| **Affected Assets** | OpenDial's authenticated browser session                                  |
| **Risk Level**      | Low (mitigated)                                                           |
| **Mitigation**      | All external links use `rel="noopener noreferrer"`                        |
| **Residual Risk**   | None known                                                                |

### AS-6: Iframe Content Attacks Live Dial

| Field               | Detail                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Threat**          | Malicious content inside a live dial iframe attacks the parent page                                                  |
| **Affected Assets** | User's session data, DOM                                                                                             |
| **Risk Level**      | Low (mitigated)                                                                                                      |
| **Mitigation**      | Iframe sandbox attribute (`allow-scripts allow-same-origin allow-forms allow-popups` but NOT `allow-top-navigation`) |
| **Residual Risk**   | `allow-same-origin` permits the iframe to set cookies in its origin; but cannot access parent                        |

### AS-7: Password Loss

| Field               | Detail                                            |
| ------------------- | ------------------------------------------------- |
| **Threat**          | User forgets master password or loses it          |
| **Affected Assets** | All encrypted backups                             |
| **Risk Level**      | High (inherent)                                   |
| **Mitigation**      | Warning at setup that password is non-recoverable |
| **Residual Risk**   | Data is permanently inaccessible                  |

### AS-8: Local Storage Theft

| Field               | Detail                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| **Threat**          | Attacker gains access to user's local storage (XSS, shared computer)           |
| **Affected Assets** | Unencrypted local data (dials in localStorage, OAuth tokens)                   |
| **Risk Level**      | Medium                                                                         |
| **Mitigation**      | Sensitive cloud credentials stored separately. Master password is session-only |
| **Residual Risk**   | Local dials/notes/tokens are not encrypted at rest (feature limitation)        |

### AS-9: Extension Distribution Attack

| Field               | Detail                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Threat**          | Attacker distributes a malicious extension seed/config                                        |
| **Affected Assets** | User's cloud account if they import credentials                                               |
| **Risk Level**      | Low (mitigated)                                                                               |
| **Mitigation**      | Extension seeds omit credentials by structural design (`omitPortableBackup` filters them out) |
| **Residual Risk**   | User must manually re-enter credentials                                                       |

## Security Decisions

| Decision                                  | Rationale                                           |
| ----------------------------------------- | --------------------------------------------------- |
| Client-side encryption via Web Crypto API | Browser-native, non-extractable keys, audited       |
| PBKDF2 over Argon2                        | Broader browser support; 100k iterations acceptable |
| Session-only master password              | Prevents password leakage at rest                   |
| No password recovery                      | Eliminates reset attack surface                     |
| Credential separation (portable vs local) | Limits blast radius of portable config compromise   |
| Strict URL validation                     | Prevents XSS via javascript:/data: URLs             |
| Iframe sandboxing                         | Isolates untrusted live content                     |
| Generic error messages                    | Prevents oracle attacks on encryption               |
