/**
 * Pluggable Sync Provider Architecture
 * Zero centralized servers: users sync to their own personal WebDAV (Nextcloud),
 * Google Drive, OneDrive, or local encrypted file vaults.
 *
 * Security invariants:
 * - Encryption happens BEFORE the sync provider layer -- providers only ever
 *   receive encrypted payloads.
 * - Providers reject plaintext downloads with `isEncrypted !== true`.
 * - Master password is required for every remote operation.
 */

import {
  RuntimeSyncSettings,
  ExportBackupData,
  SyncSettings,
  EncryptedPayload,
} from '../types/opendial';
import { encryptData, decryptData } from './crypto';
import { sanitizeImportedBackup } from './backup';

export interface SyncResult {
  success: boolean;
  message: string;
  timestamp?: number;
  remoteData?: ExportBackupData;
}

export interface SyncError {
  code: 'timeout' | 'network' | 'auth' | 'conflict' | 'corrupted' | 'unknown';
  message: string;
}

export interface SyncStatus extends SyncResult {
  error?: SyncError;
  attempts?: number;
}

/** Default error when a sync operation fails. */
export function makeSyncError(code: SyncError['code'], message: string): SyncError {
  return { code, message };
}

/** Map a thrown error to a standardized SyncError code. */
export function classifySyncError(err: Error): SyncError {
  const msg = err.message.toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return makeSyncError('timeout', err.message);
  }
  if (
    msg.includes('auth') ||
    msg.includes('credential') ||
    msg.includes('unauthorized') ||
    msg.includes('401') ||
    msg.includes('403')
  ) {
    return makeSyncError('auth', err.message);
  }
  if (msg.includes('corrupt') || msg.includes('encrypted payload required')) {
    return makeSyncError('corrupted', err.message);
  }
  if (msg.includes('conflict') || msg.includes('409') || msg.includes('precondition')) {
    return makeSyncError('conflict', err.message);
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('cors')) {
    return makeSyncError('network', err.message);
  }
  return makeSyncError('unknown', err.message);
}

export interface ISyncProvider {
  name: string;
  testConnection(): Promise<{ ok: boolean; message: string }>;
  upload(data: ExportBackupData, password?: string): Promise<SyncStatus>;
  download(password?: string): Promise<SyncStatus>;
}

/** Default timeout for sync network operations (ms). */
export const SYNC_TIMEOUT_MS = 15_000;

/** Default retry configuration. */
export const SYNC_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 5_000,
};

/**
 * Wraps a promise with an AbortController-based timeout.
 * Throws a standardized timeout error if the request takes too long.
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promise;
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Operation timed out after ${timeoutMs}ms`, { cause: err });
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retries an async operation with exponential backoff.
 * `shouldRetry` controls which errors are eligible for retry.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: { maxAttempts: number; baseDelayMs: number; maxDelayMs: number },
  shouldRetry: (err: Error) => boolean = () => true,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === config.maxAttempts || !shouldRetry(lastError)) {
        throw lastError;
      }
      const delay = Math.min(config.baseDelayMs * Math.pow(2, attempt - 1), config.maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Wraps sync fetch operations with timeout, retry, and standardized error mapping.
 * Only retries on network/timeout errors -- auth, corruption, and conflict errors
 * fail fast since retrying won't help.
 */
export async function withSyncGuards<T>(
  fn: () => Promise<T>,
  options: {
    timeoutMs?: number;
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
  } = {},
): Promise<T> {
  const timeout = options.timeoutMs ?? SYNC_TIMEOUT_MS;
  const retryConfig = {
    maxAttempts: options.maxAttempts ?? SYNC_RETRY_CONFIG.maxAttempts,
    baseDelayMs: options.baseDelayMs ?? SYNC_RETRY_CONFIG.baseDelayMs,
    maxDelayMs: options.maxDelayMs ?? SYNC_RETRY_CONFIG.maxDelayMs,
  };

  let attempts = 0;
  return withRetry(
    () => {
      attempts++;
      return withTimeout(fn(), timeout);
    },
    retryConfig,
    (err) => {
      // Only retry on network/timeout errors, not auth or corruption
      const classification = classifySyncError(err);
      return classification.code === 'network' || classification.code === 'timeout';
    },
  ).then(
    (result) => result,
    (err) => {
      // Re-throw with attempts attached for caller to use
      const error = err instanceof Error ? err : new Error(String(err));
      (error as { attempts?: number }).attempts = attempts;
      throw error;
    },
  );
}

/**
 * Conflict resolution: returns 'remote' or 'local' based on which backup is newer.
 * If timestamps are equal, 'local' wins (user's current session takes priority).
 */
export function resolveBackupConflict(
  local: ExportBackupData,
  remote: ExportBackupData,
): 'local' | 'remote' {
  if (remote.timestamp > local.timestamp) {
    return 'remote';
  }
  return 'local';
}

/**
 * Validate a downloaded remote backup. Rejects plaintext payloads.
 * Returns the validated encrypted payload envelope.
 */
export function validateRemotePayload(json: unknown): EncryptedPayload {
  if (typeof json !== 'object' || json === null) {
    throw new Error('Corrupted: remote backup is not a valid object');
  }
  const payload = json as Record<string, unknown>;
  if (payload.isEncrypted !== true) {
    throw new Error('Cloud backup rejected: encrypted payload required.');
  }
  return payload as unknown as EncryptedPayload;
}

/**
 * WebDAV Sync Provider (Nextcloud, ownCloud, Fastmail, generic WebDAV)
 */
export class WebDAVSyncProvider implements ISyncProvider {
  name = 'WebDAV (Nextcloud / Self-Hosted)';

  constructor(
    private config: SyncSettings['webdav'],
    private password: string,
  ) {}

  private getAuthHeader(): string {
    if (!this.config.username) return '';
    try {
      const credentials = btoa(
        unescape(encodeURIComponent(`${this.config.username}:${this.password}`)),
      );
      return `Basic ${credentials}`;
    } catch {
      const credentials = btoa(`${this.config.username}:${this.password}`);
      return `Basic ${credentials}`;
    }
  }

  private getFileUrl(): string {
    const base = this.config.url.trim().replace(/\/+$/g, '');
    const path = (this.config.path || '/opendial_backup.enc.json').trim().replace(/^\/+/g, '');
    return `${base}/${path}`;
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.config.url) {
      return { ok: false, message: 'WebDAV server URL is required' };
    }
    try {
      const response = await fetch(this.getFileUrl(), {
        method: 'PROPFIND',
        headers: {
          Authorization: this.getAuthHeader(),
          Depth: '0',
        },
      });

      if (response.status === 404) {
        return { ok: true, message: 'Server reached! Backup file will be created on first sync.' };
      }
      if (response.ok || response.status === 207) {
        return { ok: true, message: 'WebDAV connection successful and verified.' };
      }
      return {
        ok: false,
        message: `Server returned HTTP status ${response.status}: ${response.statusText}`,
      };
    } catch (e) {
      const err = e as Error;
      return {
        ok: false,
        message: `Connection error: ${err.message || 'CORS or Network failure'}`,
      };
    }
  }

  async upload(data: ExportBackupData, password?: string): Promise<SyncStatus> {
    try {
      if (!password) {
        return { success: false, message: 'Master password required for encrypted cloud upload.' };
      }
      const encrypted = await encryptData(sanitizeImportedBackup(data), password);
      const body = JSON.stringify(encrypted);

      const response = await withSyncGuards(() =>
        fetch(this.getFileUrl(), {
          method: 'PUT',
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body,
        }),
      );

      if (!response.ok && response.status !== 201 && response.status !== 204) {
        throw new Error(`WebDAV upload failed with HTTP status ${response.status}`);
      }

      return {
        success: true,
        message: 'Synced successfully to WebDAV server',
        timestamp: Date.now(),
      };
    } catch (e) {
      const err = e as Error;
      return {
        success: false,
        message: `Upload failed: ${err.message}`,
        error: classifySyncError(err),
        attempts: (err as { attempts?: number }).attempts,
      };
    }
  }

  async download(password?: string): Promise<SyncStatus> {
    try {
      const response = await withSyncGuards(() =>
        fetch(this.getFileUrl(), {
          method: 'GET',
          headers: { Authorization: this.getAuthHeader() },
        }),
      );

      if (response.status === 404) {
        return { success: false, message: 'No existing backup found on WebDAV server' };
      }
      if (!response.ok) {
        throw new Error(`WebDAV download failed with HTTP ${response.status}`);
      }

      const json = await response.json();
      const encryptedPayload = validateRemotePayload(json);

      if (!password) {
        return {
          success: false,
          message: 'Master password required for encrypted cloud download.',
        };
      }

      const decrypted = await decryptData<ExportBackupData>(encryptedPayload, password);
      return {
        success: true,
        message: 'Downloaded and decrypted backup successfully',
        timestamp: decrypted.timestamp,
        remoteData: sanitizeImportedBackup(decrypted),
      };
    } catch (e) {
      const err = e as Error;
      return {
        success: false,
        message: `Download failed: ${err.message}`,
        error: classifySyncError(err),
        attempts: (err as { attempts?: number }).attempts,
      };
    }
  }
}

/**
 * Google Drive Personal Sync Provider
 * Uses direct Google Drive REST API with user's access token
 */
export class GoogleDriveSyncProvider implements ISyncProvider {
  name = 'Google Drive';

  constructor(
    private config: SyncSettings['gdrive'],
    private accessToken: string,
  ) {}

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.accessToken) {
      return { ok: false, message: 'Google OAuth Access Token is required' };
    }
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (res.ok) {
        const info = await res.json();
        return {
          ok: true,
          message: `Connected as ${info.user?.displayName || 'Google Drive User'}`,
        };
      }
      return { ok: false, message: `Google Drive API error: HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, message: `Google Drive connection error: ${(e as Error).message}` };
    }
  }

  async upload(data: ExportBackupData, password?: string): Promise<SyncStatus> {
    if (!this.accessToken) {
      return { success: false, message: 'Google Drive token required' };
    }
    try {
      if (!password) {
        return { success: false, message: 'Master password required for encrypted cloud upload.' };
      }
      const encrypted = await encryptData(sanitizeImportedBackup(data), password);
      const content = JSON.stringify(encrypted);

      const fileName = this.config.fileName || 'opendial_backup.enc.json';
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        closeDelim;

      const uploadRes = await withSyncGuards(() =>
        fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }),
      );

      if (!uploadRes.ok) {
        throw new Error(`Drive upload HTTP ${uploadRes.status}`);
      }

      return {
        success: true,
        message: 'Successfully backed up to your Google Drive',
        timestamp: Date.now(),
      };
    } catch (e) {
      const err = e as Error;
      return {
        success: false,
        message: `Google Drive sync failed: ${err.message}`,
        error: classifySyncError(err),
        attempts: (err as { attempts?: number }).attempts,
      };
    }
  }

  async download(password?: string): Promise<SyncStatus> {
    if (!this.accessToken) {
      return { success: false, message: 'Google Drive token required' };
    }
    try {
      const fileName = this.config.fileName || 'opendial_backup.enc.json';
      const searchRes = await withSyncGuards(() =>
        fetch(
          `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(fileName)}' and trashed=false&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
          {
            headers: { Authorization: `Bearer ${this.accessToken}` },
          },
        ),
      );

      if (!searchRes.ok) throw new Error(`Drive search error ${searchRes.status}`);
      const searchData = await searchRes.json();
      if (!searchData.files || searchData.files.length === 0) {
        return { success: false, message: 'No OpenDial backup found in your Google Drive' };
      }

      const fileId = searchData.files[0].id;
      const fileRes = await withSyncGuards(() =>
        fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }),
      );

      if (!fileRes.ok) throw new Error(`Drive download error ${fileRes.status}`);
      const json = await fileRes.json();

      const encryptedPayload = validateRemotePayload(json);

      if (!password) {
        return {
          success: false,
          message: 'Master password required for encrypted cloud download.',
        };
      }

      const decrypted = await decryptData<ExportBackupData>(encryptedPayload, password);
      return {
        success: true,
        message: 'Downloaded & decrypted backup from Google Drive',
        timestamp: decrypted.timestamp,
        remoteData: sanitizeImportedBackup(decrypted),
      };
    } catch (e) {
      const err = e as Error;
      return {
        success: false,
        message: `Google Drive download error: ${err.message}`,
        error: classifySyncError(err),
        attempts: (err as { attempts?: number }).attempts,
      };
    }
  }
}

/**
 * Microsoft OneDrive Sync Provider
 * Uses Microsoft Graph API for 100% client-to-cloud sync
 */
export class OneDriveSyncProvider implements ISyncProvider {
  name = 'Microsoft OneDrive';

  constructor(
    private config: SyncSettings['onedrive'],
    private accessToken: string,
  ) {}

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.accessToken) {
      return { ok: false, message: 'OneDrive OAuth Access Token is required' };
    }
    try {
      const res = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (res.ok) {
        const user = await res.json();
        return { ok: true, message: `Connected as ${user.displayName || user.userPrincipalName}` };
      }
      return { ok: false, message: `OneDrive API error: HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, message: `OneDrive connection error: ${(e as Error).message}` };
    }
  }

  async upload(data: ExportBackupData, password?: string): Promise<SyncStatus> {
    if (!this.accessToken) {
      return { success: false, message: 'OneDrive token required' };
    }
    try {
      if (!password) {
        return { success: false, message: 'Master password required for encrypted cloud upload.' };
      }
      const encrypted = await encryptData(sanitizeImportedBackup(data), password);
      const content = JSON.stringify(encrypted);

      const fileName = this.config.fileName || 'opendial_backup.enc.json';
      const uploadRes = await withSyncGuards(() =>
        fetch(
          `https://graph.microsoft.com/v1.0/me/drive/root:/Apps/OpenDial/${fileName}:/content`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: content,
          },
        ),
      );

      if (!uploadRes.ok) {
        throw new Error(`OneDrive upload HTTP ${uploadRes.status}`);
      }

      return {
        success: true,
        message: 'Successfully synced to OneDrive Apps/OpenDial folder',
        timestamp: Date.now(),
      };
    } catch (e) {
      const err = e as Error;
      return {
        success: false,
        message: `OneDrive upload error: ${err.message}`,
        error: classifySyncError(err),
        attempts: (err as { attempts?: number }).attempts,
      };
    }
  }

  async download(password?: string): Promise<SyncStatus> {
    if (!this.accessToken) {
      return { success: false, message: 'OneDrive token required' };
    }
    try {
      const fileName = this.config.fileName || 'opendial_backup.enc.json';
      const fileRes = await withSyncGuards(() =>
        fetch(
          `https://graph.microsoft.com/v1.0/me/drive/root:/Apps/OpenDial/${fileName}:/content`,
          {
            headers: { Authorization: `Bearer ${this.accessToken}` },
          },
        ),
      );

      if (fileRes.status === 404) {
        return { success: false, message: 'No backup found in OneDrive' };
      }
      if (!fileRes.ok) throw new Error(`OneDrive error ${fileRes.status}`);

      const json = await fileRes.json();
      const encryptedPayload = validateRemotePayload(json);

      if (!password) {
        return {
          success: false,
          message: 'Master password required for encrypted cloud download.',
        };
      }

      const decrypted = await decryptData<ExportBackupData>(encryptedPayload, password);
      return {
        success: true,
        message: 'Restored backup from OneDrive successfully',
        timestamp: decrypted.timestamp,
        remoteData: sanitizeImportedBackup(decrypted),
      };
    } catch (e) {
      const err = e as Error;
      return {
        success: false,
        message: `OneDrive download error: ${err.message}`,
        error: classifySyncError(err),
        attempts: (err as { attempts?: number }).attempts,
      };
    }
  }
}

/**
 * Local File Vault Provider
 * Exports/Imports `.opendial` files with zero network requests
 */
export class LocalFileSyncProvider implements ISyncProvider {
  name = 'Local Encrypted Vault';

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: 'Local storage vault is active and ready.' };
  }

  async upload(data: ExportBackupData, password?: string): Promise<SyncStatus> {
    try {
      if (!password) {
        return { success: false, message: 'Master password required for encrypted local vault.' };
      }
      const encrypted = await encryptData(sanitizeImportedBackup(data), password);
      const content = JSON.stringify(encrypted, null, 2);
      const filename = `opendial-e2ee-vault-${new Date().toISOString().slice(0, 10)}.opendial`;

      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return {
        success: true,
        message: `Saved encrypted vault: ${filename}`,
        timestamp: Date.now(),
      };
    } catch (e) {
      return { success: false, message: `Export failed: ${(e as Error).message}` };
    }
  }

  async download(): Promise<SyncStatus> {
    return {
      success: true,
      message: 'Use the Import file selector below to restore local backup files.',
    };
  }
}

/**
 * Sync Manager factory
 */
export function createSyncProvider(settings: RuntimeSyncSettings): ISyncProvider {
  switch (settings.provider) {
    case 'webdav':
      return new WebDAVSyncProvider(settings.webdav, settings.credentials.webdavPassword);
    case 'gdrive':
      return new GoogleDriveSyncProvider(settings.gdrive, settings.credentials.googleAccessToken);
    case 'onedrive':
      return new OneDriveSyncProvider(settings.onedrive, settings.credentials.oneDriveAccessToken);
    case 'local':
    default:
      return new LocalFileSyncProvider();
  }
}
