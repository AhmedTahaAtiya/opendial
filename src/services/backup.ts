import {
  AppSettings,
  DialItem,
  ExportBackupData,
  FolderItem,
  MultiPageLink,
  NoteItem,
  SyncSettings,
} from '../types/opendial';
import { INITIAL_SETTINGS, INITIAL_SYNC_SETTINGS } from '../data/initialData';

export const BACKUP_SCHEMA_VERSION = '2.0.0';
const SUPPORTED_BACKUP_VERSIONS = new Set(['1.0.0', BACKUP_SCHEMA_VERSION]);

type JsonObject = Record<string, unknown>;
type LegacySyncSettings = Partial<SyncSettings> & {
  webdav?: Partial<SyncSettings['webdav']> & { password?: unknown };
  gdrive?: Partial<SyncSettings['gdrive']> & { accessToken?: unknown };
  onedrive?: Partial<SyncSettings['onedrive']> & { accessToken?: unknown };
};

function invalid(path: string, reason: string): never {
  throw new Error(`Invalid backup: ${path} ${reason}.`);
}

function objectAt(value: unknown, path: string): JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return invalid(path, 'must be an object');
  }
  return value as JsonObject;
}

function allowedKeys(value: JsonObject, path: string, keys: readonly string[]): void {
  const allowed = new Set(keys);
  const unexpected = Object.keys(value).find((key) => !allowed.has(key));
  if (unexpected) invalid(`${path}.${unexpected}`, 'is not supported');
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== 'string') return invalid(path, 'must be a string');
  return value;
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') return invalid(path, 'must be a boolean');
  return value;
}

function numberAt(value: unknown, path: string, minimum?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || (minimum !== undefined && value < minimum)) {
    return invalid(path, minimum === undefined ? 'must be a finite number' : `must be a finite number at least ${minimum}`);
  }
  return value;
}

function integerAt(value: unknown, path: string, minimum = 0): number {
  const result = numberAt(value, path, minimum);
  if (!Number.isInteger(result)) return invalid(path, 'must be an integer');
  return result;
}

function enumAt<T extends string>(value: unknown, path: string, values: readonly T[]): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    return invalid(path, `must be one of ${values.join(', ')}`);
  }
  return value as T;
}

function numericEnumAt<T extends number>(value: unknown, path: string, values: readonly T[]): T {
  if (typeof value !== 'number' || !values.includes(value as T)) {
    return invalid(path, `must be one of ${values.join(', ')}`);
  }
  return value as T;
}

function nullableString(value: unknown, path: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return stringAt(value, path);
}

const DATA_URL_PATTERN = /^data:(image\/[^;]+);base64,[A-Za-z0-9+/=]+$/;
const SAFE_URL_PROTOCOLS = ['http:', 'https:'];

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value, 'https://example.com');
    return SAFE_URL_PROTOCOLS.includes(url.protocol);
  } catch {
    return false;
  }
}

function isValidDataUrl(value: string): boolean {
  return DATA_URL_PATTERN.test(value);
}

function validateDialUrl(value: string, path: string): string {
  if (!isValidUrl(value)) invalid(path, 'must be a valid HTTP/HTTPS URL');
  return value;
}

function validateMultiLink(value: unknown, path: string): MultiPageLink {
  const item = objectAt(value, path);
  allowedKeys(item, path, ['id', 'title', 'url', 'icon']);
  return {
    id: stringAt(item.id, `${path}.id`),
    title: stringAt(item.title, `${path}.title`),
    url: validateDialUrl(stringAt(item.url, `${path}.url`), `${path}.url`),
    ...(item.icon === undefined ? {} : { icon: stringAt(item.icon, `${path}.icon`) }),
  };
}

function validateDial(value: unknown, path: string): DialItem {
  const item = objectAt(value, path);
  allowedKeys(item, path, [
    'id', 'title', 'url', 'type', 'folderId', 'icon', 'customThumbnail', 'bgColor',
    'textColor', 'tags', 'container', 'colSpan', 'rowSpan', 'multiLinks', 'liveUrl',
    'liveZoom', 'liveCropTop', 'liveRefreshInterval', 'weatherLocation', 'createdAt',
    'clicksCount', 'isDistracting',
  ]);
  if (item.tags !== undefined && !Array.isArray(item.tags)) invalid(`${path}.tags`, 'must be an array');
  if (item.multiLinks !== undefined && !Array.isArray(item.multiLinks)) invalid(`${path}.multiLinks`, 'must be an array');
  const tags = item.tags as unknown[] | undefined;
  const multiLinks = item.multiLinks as unknown[] | undefined;

  const url = stringAt(item.url, `${path}.url`);
  validateDialUrl(url, `${path}.url`);

  return {
    id: stringAt(item.id, `${path}.id`),
    title: stringAt(item.title, `${path}.title`),
    url,
    type: enumAt(item.type, `${path}.type`, ['standard', 'live', 'multipage', 'weather', 'folder']),
    createdAt: numberAt(item.createdAt, `${path}.createdAt`, 0),
    ...(item.folderId === undefined ? {} : { folderId: nullableString(item.folderId, `${path}.folderId`) }),
    ...(item.icon === undefined ? {} : { icon: stringAt(item.icon, `${path}.icon`) }),
    ...(item.customThumbnail === undefined ? {} : { customThumbnail: stringAt(item.customThumbnail, `${path}.customThumbnail`) }),
    ...(item.bgColor === undefined ? {} : { bgColor: stringAt(item.bgColor, `${path}.bgColor`) }),
    ...(item.textColor === undefined ? {} : { textColor: stringAt(item.textColor, `${path}.textColor`) }),
    ...(tags === undefined ? {} : { tags: tags.map((tag, index) => stringAt(tag, `${path}.tags[${index}]`)) }),
    ...(item.container === undefined ? {} : { container: enumAt(item.container, `${path}.container`, ['none', 'personal', 'work', 'banking', 'shopping']) }),
    ...(item.colSpan === undefined ? {} : { colSpan: numericEnumAt(item.colSpan, `${path}.colSpan`, [1, 2, 3]) }),
    ...(item.rowSpan === undefined ? {} : { rowSpan: numericEnumAt(item.rowSpan, `${path}.rowSpan`, [1, 2]) }),
    ...(multiLinks === undefined ? {} : { multiLinks: multiLinks.map((link, index) => validateMultiLink(link, `${path}.multiLinks[${index}]`)) }),
    ...(item.liveUrl === undefined ? {} : { liveUrl: stringAt(item.liveUrl, `${path}.liveUrl`) }),
    ...(item.liveZoom === undefined ? {} : { liveZoom: numberAt(item.liveZoom, `${path}.liveZoom`, 0) }),
    ...(item.liveCropTop === undefined ? {} : { liveCropTop: numberAt(item.liveCropTop, `${path}.liveCropTop`, 0) }),
    ...(item.liveRefreshInterval === undefined ? {} : { liveRefreshInterval: numberAt(item.liveRefreshInterval, `${path}.liveRefreshInterval`, 0) }),
    ...(item.weatherLocation === undefined ? {} : { weatherLocation: stringAt(item.weatherLocation, `${path}.weatherLocation`) }),
    ...(item.clicksCount === undefined ? {} : { clicksCount: integerAt(item.clicksCount, `${path}.clicksCount`) }),
    ...(item.isDistracting === undefined ? {} : { isDistracting: booleanAt(item.isDistracting, `${path}.isDistracting`) }),
  };
}

function validateFolder(value: unknown, path: string): FolderItem {
  const item = objectAt(value, path);
  allowedKeys(item, path, ['id', 'title', 'parentId', 'color', 'icon', 'createdAt']);
  return {
    id: stringAt(item.id, `${path}.id`),
    title: stringAt(item.title, `${path}.title`),
    createdAt: numberAt(item.createdAt, `${path}.createdAt`, 0),
    ...(item.parentId === undefined ? {} : { parentId: nullableString(item.parentId, `${path}.parentId`) }),
    ...(item.color === undefined ? {} : { color: stringAt(item.color, `${path}.color`) }),
    ...(item.icon === undefined ? {} : { icon: stringAt(item.icon, `${path}.icon`) }),
  };
}

function validateNote(value: unknown, path: string): NoteItem {
  const item = objectAt(value, path);
  allowedKeys(item, path, ['id', 'text', 'isCompleted', 'createdAt']);
  return {
    id: stringAt(item.id, `${path}.id`),
    text: stringAt(item.text, `${path}.text`),
    isCompleted: booleanAt(item.isCompleted, `${path}.isCompleted`),
    createdAt: numberAt(item.createdAt, `${path}.createdAt`, 0),
  };
}

function validateSettings(value: unknown, path: string): AppSettings {
  const settings = objectAt(value, path);
  allowedKeys(settings, path, [
    'theme', 'gridColumns', 'cardRadius', 'backgroundStyle', 'customWallpaperUrl',
    'productivityMode', 'showSearch', 'showWeather', 'showWidgets',
    'defaultSearchEngine', 'activeTagFilter', 'viewDensity', 'showKeyShortcuts',
  ]);
  return {
    theme: enumAt(settings.theme, `${path}.theme`, ['dark', 'light', 'amoled', 'nord', 'glass']),
    gridColumns: integerAt(settings.gridColumns, `${path}.gridColumns`, 1),
    cardRadius: enumAt(settings.cardRadius, `${path}.cardRadius`, ['sm', 'md', 'lg', 'full']),
    backgroundStyle: enumAt(settings.backgroundStyle, `${path}.backgroundStyle`, ['gradient', 'minimal', 'mesh', 'custom']),
    productivityMode: booleanAt(settings.productivityMode, `${path}.productivityMode`),
    showSearch: booleanAt(settings.showSearch, `${path}.showSearch`),
    showWeather: booleanAt(settings.showWeather, `${path}.showWeather`),
    showWidgets: booleanAt(settings.showWidgets, `${path}.showWidgets`),
    defaultSearchEngine: stringAt(settings.defaultSearchEngine, `${path}.defaultSearchEngine`),
    activeTagFilter: nullableString(settings.activeTagFilter, `${path}.activeTagFilter`) ?? null,
    ...(settings.customWallpaperUrl === undefined ? {} : { customWallpaperUrl: stringAt(settings.customWallpaperUrl, `${path}.customWallpaperUrl`) }),
    ...(settings.viewDensity === undefined ? {} : { viewDensity: enumAt(settings.viewDensity, `${path}.viewDensity`, ['station', 'compact', 'editorial']) }),
    ...(settings.showKeyShortcuts === undefined ? {} : { showKeyShortcuts: booleanAt(settings.showKeyShortcuts, `${path}.showKeyShortcuts`) }),
  };
}

function validateCredential(value: unknown, path: string): void {
  if (value !== undefined && typeof value !== 'string') invalid(path, 'must be a string');
}

function validateSyncSettings(value: unknown, path: string): SyncSettings {
  const source = objectAt(value, path);
  allowedKeys(source, path, [
    'enabled', 'provider', 'e2eeEnabled', 'passwordDerivedKeySalt', 'lastSyncTimestamp',
    'autoSyncIntervalMinutes', 'webdav', 'gdrive', 'onedrive',
  ]);
  const webdav = objectAt(source.webdav, `${path}.webdav`);
  const gdrive = objectAt(source.gdrive, `${path}.gdrive`);
  const onedrive = objectAt(source.onedrive, `${path}.onedrive`);
  allowedKeys(webdav, `${path}.webdav`, ['url', 'username', 'path', 'requiresAuthentication', 'password']);
  allowedKeys(gdrive, `${path}.gdrive`, ['provider', 'folderName', 'fileName', 'lastSyncedAt', 'requiresAuthentication', 'accessToken']);
  allowedKeys(onedrive, `${path}.onedrive`, ['provider', 'folderName', 'fileName', 'lastSyncedAt', 'requiresAuthentication', 'accessToken']);
  validateCredential(webdav.password, `${path}.webdav.password`);
  validateCredential(gdrive.accessToken, `${path}.gdrive.accessToken`);
  validateCredential(onedrive.accessToken, `${path}.onedrive.accessToken`);

  return {
    enabled: booleanAt(source.enabled, `${path}.enabled`),
    provider: enumAt(source.provider, `${path}.provider`, ['local', 'webdav', 'gdrive', 'onedrive']),
    e2eeEnabled: true,
    autoSyncIntervalMinutes: numberAt(source.autoSyncIntervalMinutes, `${path}.autoSyncIntervalMinutes`, 0),
    ...(source.passwordDerivedKeySalt === undefined ? {} : { passwordDerivedKeySalt: stringAt(source.passwordDerivedKeySalt, `${path}.passwordDerivedKeySalt`) }),
    ...(source.lastSyncTimestamp === undefined ? {} : { lastSyncTimestamp: numberAt(source.lastSyncTimestamp, `${path}.lastSyncTimestamp`, 0) }),
    webdav: {
      url: stringAt(webdav.url, `${path}.webdav.url`),
      username: stringAt(webdav.username, `${path}.webdav.username`),
      path: stringAt(webdav.path, `${path}.webdav.path`),
      requiresAuthentication: true,
    },
    gdrive: {
      provider: enumAt(gdrive.provider, `${path}.gdrive.provider`, ['gdrive']),
      folderName: stringAt(gdrive.folderName, `${path}.gdrive.folderName`),
      fileName: stringAt(gdrive.fileName, `${path}.gdrive.fileName`),
      ...(gdrive.lastSyncedAt === undefined ? {} : { lastSyncedAt: numberAt(gdrive.lastSyncedAt, `${path}.gdrive.lastSyncedAt`, 0) }),
      requiresAuthentication: true,
    },
    onedrive: {
      provider: enumAt(onedrive.provider, `${path}.onedrive.provider`, ['onedrive']),
      folderName: stringAt(onedrive.folderName, `${path}.onedrive.folderName`),
      fileName: stringAt(onedrive.fileName, `${path}.onedrive.fileName`),
      ...(onedrive.lastSyncedAt === undefined ? {} : { lastSyncedAt: numberAt(onedrive.lastSyncedAt, `${path}.onedrive.lastSyncedAt`, 0) }),
      requiresAuthentication: true,
    },
  };
}

/** Reconstruct portable configuration from an allowlist; never copy provider credentials. */
export function sanitizeSyncSettings(input?: LegacySyncSettings | null): SyncSettings {
  if (!input) return structuredClone(INITIAL_SYNC_SETTINGS);
  return validateSyncSettings(input, 'syncSettings');
}

export interface BackupSource {
  dials: DialItem[];
  folders: FolderItem[];
  notes: NoteItem[];
  settings: AppSettings;
  syncSettings: SyncSettings;
}

export function createPortableBackup(source: BackupSource): ExportBackupData {
  return {
    version: BACKUP_SCHEMA_VERSION,
    timestamp: Date.now(),
    appName: 'OpenDial',
    isEncrypted: false,
    dials: source.dials,
    folders: source.folders,
    notes: source.notes,
    settings: source.settings,
    syncSettings: sanitizeSyncSettings(source.syncSettings),
  };
}

/** Validate and normalize every imported backup, including decrypted and legacy payloads. */
export function sanitizeImportedBackup(input: unknown): ExportBackupData {
  const data = objectAt(input, 'payload');
  allowedKeys(data, 'payload', [
    'version', 'timestamp', 'appName', 'isEncrypted', 'dials', 'folders', 'notes',
    'settings', 'syncSettings',
  ]);
  const version = stringAt(data.version, 'version');
  if (!/^\d+\.\d+\.\d+$/.test(version)) invalid('version', 'must use semantic version format');
  if (!SUPPORTED_BACKUP_VERSIONS.has(version)) {
    throw new Error(`Unsupported backup version "${version}". This OpenDial version supports 1.0.0 and ${BACKUP_SCHEMA_VERSION}.`);
  }
  if (!Array.isArray(data.dials)) invalid('dials', 'must be an array');
  if (data.appName !== undefined && data.appName !== 'OpenDial') invalid('appName', 'must be OpenDial');
  if (data.isEncrypted !== undefined && data.isEncrypted !== false) invalid('isEncrypted', 'must be false after decryption');

  const legacy = version === '1.0.0';
  const folders = data.folders === undefined && legacy ? [] : data.folders;
  const notes = data.notes === undefined && legacy ? [] : data.notes;
  const settings = data.settings === undefined && legacy ? INITIAL_SETTINGS : data.settings;
  const syncSettings = data.syncSettings === undefined && legacy ? INITIAL_SYNC_SETTINGS : data.syncSettings;
  if (!Array.isArray(folders)) invalid('folders', 'must be an array');
  if (!Array.isArray(notes)) invalid('notes', 'must be an array');

  return {
    version: BACKUP_SCHEMA_VERSION,
    timestamp: data.timestamp === undefined && legacy ? Date.now() : numberAt(data.timestamp, 'timestamp', 0),
    appName: 'OpenDial',
    isEncrypted: false,
    dials: data.dials.map((dial, index) => validateDial(dial, `dials[${index}]`)),
    folders: folders.map((folder, index) => validateFolder(folder, `folders[${index}]`)),
    notes: notes.map((note, index) => validateNote(note, `notes[${index}]`)),
    settings: validateSettings(settings, 'settings'),
    syncSettings: validateSyncSettings(syncSettings, 'syncSettings'),
  };
}
