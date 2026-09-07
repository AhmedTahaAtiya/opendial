import { DialItem, FolderItem, NoteItem, SearchEngine, AppSettings, SyncSettings } from '../types/opendial';

export const DEFAULT_SEARCH_ENGINES: SearchEngine[] = [
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=%s',
    iconName: 'Shield',
    shortcut: '!d',
  },
  {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com/search?q=%s',
    iconName: 'Search',
    shortcut: '!g',
  },
  {
    id: 'bing',
    name: 'Bing',
    url: 'https://www.bing.com/search?q=%s',
    iconName: 'Globe',
    shortcut: '!b',
  },
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com/search?q=%s',
    iconName: 'Code',
    shortcut: '!gh',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://www.youtube.com/results?search_query=%s',
    iconName: 'PlaySquare',
    shortcut: '!y',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    url: 'https://www.reddit.com/search/?q=%s',
    iconName: 'MessageSquare',
    shortcut: '!r',
  },
];

export const INITIAL_FOLDERS: FolderItem[] = [];

export const INITIAL_DIALS: DialItem[] = [];

export const INITIAL_NOTES: NoteItem[] = [];

export const INITIAL_SETTINGS: AppSettings = {
  theme: 'dark',
  gridColumns: 5,
  cardRadius: 'md',
  backgroundStyle: 'minimal',
  productivityMode: false,
  showSearch: true,
  showWeather: true,
  showWidgets: true,
  defaultSearchEngine: 'duckduckgo',
  activeTagFilter: null,
  viewDensity: 'station',
  showKeyShortcuts: true,
};

export const INITIAL_SYNC_SETTINGS: SyncSettings = {
  enabled: false,
  provider: 'local',
  // Legacy compatibility field. Cloud providers enforce encryption regardless of this value.
  e2eeEnabled: true,
  autoSyncIntervalMinutes: 0,
  webdav: {
    url: '',
    username: '',
    path: '/opendial_backup.enc.json',
    requiresAuthentication: true,
  },
  gdrive: {
    provider: 'gdrive',
    folderName: 'OpenDial',
    fileName: 'opendial_backup.enc.json',
    requiresAuthentication: true,
  },
  onedrive: {
    provider: 'onedrive',
    folderName: 'OpenDial',
    fileName: 'opendial_backup.enc.json',
    requiresAuthentication: true,
  },
};
