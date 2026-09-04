/**
 * Pluggable Sync Provider Architecture
 * Zero centralized servers: users sync to their own personal WebDAV (Nextcloud),
 * Google Drive, OneDrive, or local encrypted file vaults.
 */

import { SyncSettings, ExportBackupData } from '../types/opendial';
import { encryptData, decryptData } from './crypto';

export interface SyncResult {
  success: boolean;
  message: string;
  timestamp?: number;
  remoteData?: ExportBackupData;
}

export interface ISyncProvider {
  name: string;
  testConnection(): Promise<{ ok: boolean; message: string }>;
  upload(data: ExportBackupData, password?: string): Promise<SyncResult>;
  download(password?: string): Promise<SyncResult>;
}

/**
 * WebDAV Sync Provider (Nextcloud, ownCloud, Fastmail, generic WebDAV)
 */
export class WebDAVSyncProvider implements ISyncProvider {
  name = 'WebDAV (Nextcloud / Self-Hosted)';

  constructor(private config: SyncSettings['webdav']) {}

  private getAuthHeader(): string {
    if (!this.config.username) return '';
    const credentials = btoa(`${this.config.username}:${this.config.password || ''}`);
    return `Basic ${credentials}`;
  }

  private getFileUrl(): string {
    let base = this.config.url.trim().replace(/\/+$/, '');
    let path = (this.config.path || '/opendial_backup.enc.json').trim().replace(/^\/+/, '');
    return `${base}/${path}`;
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.config.url) {
      return { ok: false, message: 'WebDAV server URL is required' };
    }
    try {
      // PROPFIND or HEAD request
      const response = await fetch(this.getFileUrl(), {
        method: 'PROPFIND',
        headers: {
          Authorization: this.getAuthHeader(),
          Depth: '0',
        },
      });

      if (response.status === 404) {
        // File doesn't exist yet, but server reached!
        return { ok: true, message: 'Server reached! Backup file will be created on first sync.' };
      }
      if (response.ok || response.status === 207) {
        return { ok: true, message: 'WebDAV connection successful and verified.' };
      }
      return { ok: false, message: `Server returned HTTP status ${response.status}: ${response.statusText}` };
    } catch (e) {
      const err = e as Error;
      return { ok: false, message: `Connection error: ${err.message || 'CORS or Network failure'}` };
    }
  }

  async upload(data: ExportBackupData, password?: string): Promise<SyncResult> {
    try {
      let body: string;
      if (password) {
        const encrypted = await encryptData(data, password);
        body = JSON.stringify(encrypted, null, 2);
      } else {
        body = JSON.stringify(data, null, 2);
      }

      const response = await fetch(this.getFileUrl(), {
        method: 'PUT',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body,
      });

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
      };
    }
  }

  async download(password?: string): Promise<SyncResult> {
    try {
      const response = await fetch(this.getFileUrl(), {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      if (response.status === 404) {
        return { success: false, message: 'No existing backup found on WebDAV server' };
      }
      if (!response.ok) {
        throw new Error(`WebDAV download failed with HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.isEncrypted) {
        if (!password) {
          return { success: false, message: 'Encrypted backup found. Master password required.' };
        }
        const decrypted = await decryptData<ExportBackupData>(json, password);
        return {
          success: true,
          message: 'Downloaded and decrypted backup successfully',
          timestamp: decrypted.timestamp,
          remoteData: decrypted,
        };
      }

      return {
        success: true,
        message: 'Downloaded backup successfully',
        timestamp: json.timestamp,
        remoteData: json,
      };
    } catch (e) {
      const err = e as Error;
      return {
        success: false,
        message: `Download failed: ${err.message}`,
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

  constructor(private config: SyncSettings['gdrive']) {}

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.config.accessToken) {
      return { ok: false, message: 'Google OAuth Access Token is required' };
    }
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: { Authorization: `Bearer ${this.config.accessToken}` },
      });
      if (res.ok) {
        const info = await res.json();
        return { ok: true, message: `Connected as ${info.user?.displayName || 'Google Drive User'}` };
      }
      return { ok: false, message: `Google Drive API error: HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, message: `Google Drive connection error: ${(e as Error).message}` };
    }
  }

  async upload(data: ExportBackupData, password?: string): Promise<SyncResult> {
    if (!this.config.accessToken) {
      return { success: false, message: 'Google Drive token required' };
    }

    try {
      let content: string;
      if (password) {
        const encrypted = await encryptData(data, password);
        content = JSON.stringify(encrypted, null, 2);
      } else {
        content = JSON.stringify(data, null, 2);
      }

      // Upload file multipart to Drive
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

      const uploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
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
      return { success: false, message: `Google Drive sync failed: ${(e as Error).message}` };
    }
  }

  async download(password?: string): Promise<SyncResult> {
    if (!this.config.accessToken) {
      return { success: false, message: 'Google Drive token required' };
    }
    try {
      const fileName = this.config.fileName || 'opendial_backup.enc.json';
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(fileName)}' and trashed=false&fields=files(id,name,modifiedTime)`,
        {
          headers: { Authorization: `Bearer ${this.config.accessToken}` },
        }
      );
      if (!searchRes.ok) throw new Error(`Drive search error ${searchRes.status}`);
      const searchData = await searchRes.json();
      if (!searchData.files || searchData.files.length === 0) {
        return { success: false, message: 'No OpenDial backup found in your Google Drive' };
      }

      const fileId = searchData.files[0].id;
      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${this.config.accessToken}` },
      });

      if (!fileRes.ok) throw new Error(`Drive download error ${fileRes.status}`);
      const json = await fileRes.json();

      if (json.isEncrypted) {
        if (!password) {
          return { success: false, message: 'Encrypted backup found. Master password required.' };
        }
        const decrypted = await decryptData<ExportBackupData>(json, password);
        return {
          success: true,
          message: 'Downloaded & decrypted backup from Google Drive',
          timestamp: decrypted.timestamp,
          remoteData: decrypted,
        };
      }

      return {
        success: true,
        message: 'Downloaded backup from Google Drive',
        timestamp: json.timestamp,
        remoteData: json,
      };
    } catch (e) {
      return { success: false, message: `Google Drive download error: ${(e as Error).message}` };
    }
  }
}

/**
 * Microsoft OneDrive Sync Provider
 * Uses Microsoft Graph API for 100% client-to-cloud sync
 */
export class OneDriveSyncProvider implements ISyncProvider {
  name = 'Microsoft OneDrive';

  constructor(private config: SyncSettings['onedrive']) {}

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.config.accessToken) {
      return { ok: false, message: 'OneDrive OAuth Access Token is required' };
    }
    try {
      const res = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${this.config.accessToken}` },
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

  async upload(data: ExportBackupData, password?: string): Promise<SyncResult> {
    if (!this.config.accessToken) {
      return { success: false, message: 'OneDrive token required' };
    }
    try {
      let content: string;
      if (password) {
        const encrypted = await encryptData(data, password);
        content = JSON.stringify(encrypted, null, 2);
      } else {
        content = JSON.stringify(data, null, 2);
      }

      const fileName = this.config.fileName || 'opendial_backup.enc.json';
      const uploadRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/Apps/OpenDial/${fileName}:/content`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: content,
        }
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
      return { success: false, message: `OneDrive upload error: ${(e as Error).message}` };
    }
  }

  async download(password?: string): Promise<SyncResult> {
    if (!this.config.accessToken) {
      return { success: false, message: 'OneDrive token required' };
    }
    try {
      const fileName = this.config.fileName || 'opendial_backup.enc.json';
      const fileRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/Apps/OpenDial/${fileName}:/content`,
        {
          headers: { Authorization: `Bearer ${this.config.accessToken}` },
        }
      );

      if (fileRes.status === 404) {
        return { success: false, message: 'No backup found in OneDrive' };
      }
      if (!fileRes.ok) throw new Error(`OneDrive error ${fileRes.status}`);

      const json = await fileRes.json();
      if (json.isEncrypted) {
        if (!password) {
          return { success: false, message: 'Encrypted backup found. Master password required.' };
        }
        const decrypted = await decryptData<ExportBackupData>(json, password);
        return {
          success: true,
          message: 'Restored backup from OneDrive successfully',
          timestamp: decrypted.timestamp,
          remoteData: decrypted,
        };
      }

      return {
        success: true,
        message: 'Restored backup from OneDrive',
        timestamp: json.timestamp,
        remoteData: json,
      };
    } catch (e) {
      return { success: false, message: `OneDrive download error: ${(e as Error).message}` };
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

  async upload(data: ExportBackupData, password?: string): Promise<SyncResult> {
    try {
      let content: string;
      let filename = `opendial-backup-${new Date().toISOString().slice(0, 10)}.json`;
      if (password) {
        const encrypted = await encryptData(data, password);
        content = JSON.stringify(encrypted, null, 2);
        filename = `opendial-e2ee-vault-${new Date().toISOString().slice(0, 10)}.opendial`;
      } else {
        content = JSON.stringify(data, null, 2);
      }

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
        message: `Saved backup file: ${filename}`,
        timestamp: Date.now(),
      };
    } catch (e) {
      return { success: false, message: `Export failed: ${(e as Error).message}` };
    }
  }

  async download(): Promise<SyncResult> {
    return {
      success: true,
      message: 'Use the Import file selector below to restore local backup files.',
    };
  }
}

/**
 * Sync Manager factory
 */
export function createSyncProvider(settings: SyncSettings): ISyncProvider {
  switch (settings.provider) {
    case 'webdav':
      return new WebDAVSyncProvider(settings.webdav);
    case 'gdrive':
      return new GoogleDriveSyncProvider(settings.gdrive);
    case 'onedrive':
      return new OneDriveSyncProvider(settings.onedrive);
    case 'local':
    default:
      return new LocalFileSyncProvider();
  }
}
