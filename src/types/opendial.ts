export type DialType = 'standard' | 'live' | 'multipage' | 'weather' | 'folder';

export type FirefoxContainer = 'none' | 'personal' | 'work' | 'banking' | 'shopping';

export interface MultiPageLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

/** Base fields shared by all dial types. */
export interface DialItemBase {
  id: string;
  title: string;
  url: string;
  folderId?: string | null; // null or undefined means root
  icon?: string;
  customThumbnail?: string; // base64 data URL or IndexedDB blob key
  bgColor?: string;
  textColor?: string;
  tags?: string[];
  container?: FirefoxContainer;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
  createdAt: number;
  clicksCount?: number;
  isDistracting?: boolean; // for Productivity / Focus Mode
}

/** A standard speed dial — navigates to a URL on click. */
export interface StandardDial extends DialItemBase {
  type: 'standard';
}

/** A live dial — renders a sandboxed, auto-refreshing iframe. */
export interface LiveDial extends DialItemBase {
  type: 'live';
  liveUrl?: string;
  liveZoom?: number; // percentage, e.g. 100, 80, 120
  liveCropTop?: number; // pixels
  liveRefreshInterval?: number; // seconds, 0 = no auto refresh
}

/** A multi-page dial — bundles related links that open concurrently. */
export interface MultiPageDial extends DialItemBase {
  type: 'multipage';
  multiLinks?: MultiPageLink[];
}

/** A weather dial — shows live meteorological telemetry with a 5-day forecast. */
export interface WeatherDial extends DialItemBase {
  type: 'weather';
  weatherLocation?: string;
}

/** A folder dial — opens a drawer containing grouped dials. */
export interface FolderDial extends DialItemBase {
  type: 'folder';
  folderId: string;
}

/**
 * Discriminated union of all dial types, keyed on the `type` field.
 *
 * The flat `DialItem` interface (below) is retained for backward compatibility
 * with existing backup data and serialization. New code should prefer
 * `TypedDial` for type-safe narrowing.
 */
export type TypedDial = StandardDial | LiveDial | MultiPageDial | WeatherDial | FolderDial;

/**
 * Flat, backward-compatible dial type used for storage and serialization.
 * Use `asTypedDial(item)` to narrow to `TypedDial` for type-safe access.
 *
 * @deprecated Prefer `TypedDial` in new code. This interface is retained
 *   for compatibility with existing backup data and the storage layer.
 */
export interface DialItem {
  id: string;
  title: string;
  url: string;
  type: DialType;
  folderId?: string | null; // null or undefined means root
  icon?: string;
  customThumbnail?: string; // base64 data URL or IndexedDB blob key
  bgColor?: string;
  textColor?: string;
  tags?: string[];
  container?: FirefoxContainer;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
  // Multi-page specific
  multiLinks?: MultiPageLink[];
  // Live Dial specific
  liveUrl?: string;
  liveZoom?: number; // percentage, e.g. 100, 80, 120
  liveCropTop?: number; // pixels
  liveRefreshInterval?: number; // seconds, 0 = no auto refresh
  // Weather dial specific
  weatherLocation?: string;
  createdAt: number;
  clicksCount?: number;
  isDistracting?: boolean; // for Productivity / Focus Mode
}

/**
 * Type guard: narrows a flat `DialItem` to its specific `TypedDial` variant.
 *
 * @example
 * if (isLiveDial(dial)) {
 *   // TypeScript now knows dial.liveUrl, dial.liveZoom, etc. are available
 *   console.log(dial.liveZoom);
 * }
 */
export function asTypedDial(dial: DialItem): TypedDial {
  switch (dial.type) {
    case 'standard':
      return dial as StandardDial;
    case 'live':
      return dial as LiveDial;
    case 'multipage':
      return dial as MultiPageDial;
    case 'weather':
      return dial as WeatherDial;
    case 'folder':
      return dial as FolderDial;
    default: {
      const _exhaustive: never = dial.type;
      return _exhaustive;
    }
  }
}

/**
 * Type guard: checks whether a flat `DialItem` is a LiveDial.
 */
export function isLiveDial(dial: DialItem): dial is LiveDial {
  return dial.type === 'live';
}

/**
 * Type guard: checks whether a flat `DialItem` is a MultiPageDial.
 */
export function isMultiPageDial(dial: DialItem): dial is MultiPageDial {
  return dial.type === 'multipage';
}

/**
 * Type guard: checks whether a flat `DialItem` is a WeatherDial.
 */
export function isWeatherDial(dial: DialItem): dial is WeatherDial {
  return dial.type === 'weather';
}

/**
 * Type guard: checks whether a flat `DialItem` is a FolderDial.
 */
export function isFolderDial(dial: DialItem): dial is FolderDial {
  return dial.type === 'folder';
}

/**
 * Type guard: checks whether a flat `DialItem` is a StandardDial.
 */
export function isStandardDial(dial: DialItem): dial is StandardDial {
  return dial.type === 'standard';
}

export interface FolderItem {
  id: string;
  title: string;
  parentId?: string | null;
  color?: string;
  icon?: string;
  createdAt: number;
}

export interface SearchEngine {
  id: string;
  name: string;
  url: string; // e.g. https://www.google.com/search?q=%s
  iconName: string;
  shortcut: string;
}

export interface NoteItem {
  id: string;
  text: string;
  isCompleted: boolean;
  createdAt: number;
}

export interface RecentTabItem {
  id: string;
  title: string;
  url: string;
}

export type SyncProviderType = 'local' | 'webdav' | 'gdrive' | 'onedrive';

export interface WebDAVConfig {
  url: string;
  username: string;
  path: string;
  requiresAuthentication: boolean;
}

export interface CloudDriveConfig {
  provider: 'gdrive' | 'onedrive';
  folderName: string;
  fileName: string;
  lastSyncedAt?: number;
  requiresAuthentication: boolean;
}

/** Portable sync configuration. Provider secrets must never be added here. */
export interface SyncSettings {
  enabled: boolean;
  provider: SyncProviderType;
  e2eeEnabled: boolean;
  passwordDerivedKeySalt?: string; // base64
  lastSyncTimestamp?: number;
  autoSyncIntervalMinutes: number; // 0 for manual only
  webdav: WebDAVConfig;
  gdrive: CloudDriveConfig;
  onedrive: CloudDriveConfig;
}

/** Local-only provider credentials, stored separately from portable application data. */
export interface SyncCredentials {
  webdavPassword: string;
  googleAccessToken: string;
  oneDriveAccessToken: string;
}

export interface RuntimeSyncSettings extends SyncSettings {
  credentials: SyncCredentials;
}

export type ViewDensity = 'station' | 'compact' | 'editorial';

export interface AppSettings {
  theme: 'dark' | 'light' | 'amoled' | 'nord' | 'glass';
  gridColumns: number; // 4, 5, 6, 7
  cardRadius: 'sm' | 'md' | 'lg' | 'full';
  backgroundStyle: 'gradient' | 'minimal' | 'mesh' | 'custom';
  customWallpaperUrl?: string;
  productivityMode: boolean; // Hide distracting dials
  showSearch: boolean;
  showWeather: boolean;
  showWidgets: boolean;
  defaultSearchEngine: string;
  activeTagFilter: string | null;
  viewDensity?: ViewDensity;
  showKeyShortcuts?: boolean;
}

export interface ExportBackupData {
  version: string;
  timestamp: number;
  appName: string;
  isEncrypted: boolean;
  dials: DialItem[];
  folders: FolderItem[];
  notes: NoteItem[];
  settings: AppSettings;
  syncSettings: SyncSettings;
}

export interface EncryptedPayload {
  version: '1';
  isEncrypted: true;
  kdf: {
    name: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    salt: string; // base64
  };
  cipher: {
    name: 'AES-GCM';
    keyLength: 256;
    iv: string; // base64
    tagLength: 128;
  };
  ciphertext: string; // base64 ciphertext with the authentication tag appended
}
