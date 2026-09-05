export type DialType = 'standard' | 'live' | 'multipage' | 'weather' | 'folder';

export type FirefoxContainer = 'none' | 'personal' | 'work' | 'banking' | 'shopping';

export interface MultiPageLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

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

export type SyncProviderType = 'local' | 'webdav' | 'gdrive' | 'onedrive';

export interface WebDAVConfig {
  url: string;
  username: string;
  password?: string;
  path: string;
}

export interface CloudDriveConfig {
  provider: 'gdrive' | 'onedrive';
  accessToken?: string;
  folderName: string;
  fileName: string;
  lastSyncedAt?: number;
}

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
  viewDensity?: 'station' | 'compact' | 'editorial';
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