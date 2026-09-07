/**
 * Storage Layer:
 * - IndexedDB for high-res thumbnails & offline blobs
 * - LocalStorage for fast synchronous UI state & configuration
 *
 * Provider credentials use a dedicated local-only key. localStorage is not a secure vault:
 * same-origin script can read it. This separation only prevents credentials from entering
 * normal persistence, exports, extension seeds, and cloud backup plaintext.
 */

import { SyncCredentials, SyncSettings } from '../types/opendial';
import { sanitizeSyncSettings } from './backup';

const DB_NAME = 'opendial_db';
const DB_VERSION = 1;
const BLOB_STORE = 'thumbnails';

let dbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(BLOB_STORE)) {
          db.createObjectStore(BLOB_STORE);
        }
      };
    });
  }
  return dbPromise;
}

export async function saveThumbnailBlob(key: string, dataUrlOrBlob: string | Blob): Promise<void> {
  const db = await getIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    const store = tx.objectStore(BLOB_STORE);
    const req = store.put(dataUrlOrBlob, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getThumbnailBlob(key: string): Promise<string | Blob | null> {
  try {
    const db = await getIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(BLOB_STORE, 'readonly');
      const store = tx.objectStore(BLOB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteThumbnailBlob(key: string): Promise<void> {
  try {
    const db = await getIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(BLOB_STORE, 'readwrite');
      const store = tx.objectStore(BLOB_STORE);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

// LocalStorage helpers with type safety & error resilience
export function loadFromLocal<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(`opendial_${key}`);
    if (!item) return defaultValue;

    return JSON.parse(item);
  } catch (e) {
    console.warn(`Failed to parse local storage for key ${key}`, e);
    return defaultValue;
  }
}

export function saveToLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`opendial_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save to local storage for key ${key}`, e);
  }
}

const CREDENTIALS_KEY = 'opendial_sync_credentials_local_only';
const EMPTY_CREDENTIALS: SyncCredentials = {
  webdavPassword: '',
  googleAccessToken: '',
  oneDriveAccessToken: '',
};

export function loadSyncSettings(defaultValue: SyncSettings): SyncSettings {
  const legacy = loadFromLocal<unknown>('sync', defaultValue);
  const sanitized = sanitizeSyncSettings(legacy as Parameters<typeof sanitizeSyncSettings>[0]);
  saveToLocal('sync', sanitized);
  return sanitized;
}

export function loadSyncCredentials(): SyncCredentials {
  const stored = loadFromLocal<Partial<SyncCredentials>>('sync_credentials_local_only', {});
  return { ...EMPTY_CREDENTIALS, ...stored };
}

export function saveSyncCredentials(credentials: SyncCredentials): void {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export function clearSyncCredentials(): void {
  localStorage.removeItem(CREDENTIALS_KEY);
}

export function clearAllStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('opendial_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Failed to clear storage:', e);
  }
}