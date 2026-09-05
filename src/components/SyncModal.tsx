import React, { useState } from 'react';
import {
  X,
  Lock,
  Cloud,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Server,
  UploadCloud,
  DownloadCloud,
} from 'lucide-react';
import { SyncSettings, SyncProviderType, ExportBackupData } from '../types/opendial';
import { createSyncProvider, SyncResult } from '../services/sync';
import { checkPasswordStrength } from '../services/crypto';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncSettings: SyncSettings;
  onUpdateSyncSettings: (settings: SyncSettings) => void;
  currentBackupData: ExportBackupData;
  onRestoreBackupData: (data: ExportBackupData) => void;
  masterPassword: string;
  onRequireUnlock: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  syncSettings,
  onUpdateSyncSettings,
  currentBackupData,
  onRestoreBackupData,
  masterPassword,
  onRequireUnlock,
}) => {
  const [provider, setProvider] = useState<SyncProviderType>(syncSettings.provider);
  const [e2eeEnabled, setE2eeEnabled] = useState(syncSettings.e2eeEnabled);

  // WebDAV fields
  const [webdavUrl, setWebdavUrl] = useState(syncSettings.webdav.url);
  const [webdavUser, setWebdavUser] = useState(syncSettings.webdav.username);
  const [webdavPass, setWebdavPass] = useState(syncSettings.webdav.password || '');
  const [webdavPath, setWebdavPath] = useState(syncSettings.webdav.path);

  // Cloud Drive tokens
  const [gdriveToken, setGdriveToken] = useState(syncSettings.gdrive.accessToken || '');
  const [onedriveToken, setOnedriveToken] = useState(syncSettings.onedrive.accessToken || '');

  // Status & testing
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncResult | null>(null);

  if (!isOpen) return null;

  const passwordStrength = checkPasswordStrength(masterPassword);

  const getCurrentConfig = (): SyncSettings => {
    return {
      ...syncSettings,
      provider,
      e2eeEnabled,
      webdav: {
        url: webdavUrl,
        username: webdavUser,
        password: webdavPass,
        path: webdavPath || '/opendial_backup.enc.json',
      },
      gdrive: {
        ...syncSettings.gdrive,
        accessToken: gdriveToken,
      },
      onedrive: {
        ...syncSettings.onedrive,
        accessToken: onedriveToken,
      },
    };
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const config = getCurrentConfig();
      const syncEngine = createSyncProvider(config);
      const res = await syncEngine.testConnection();
      setTestResult(res);
    } catch (e) {
      setTestResult({ ok: false, message: `Test failed: ${(e as Error).message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleUploadNow = async () => {
    if (e2eeEnabled && !masterPassword) {
      setSyncStatus({ success: false, message: 'Unlock the session to use encrypted sync.' });
      onRequireUnlock();
      return;
    }
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const config = getCurrentConfig();
      onUpdateSyncSettings(config);

      const syncEngine = createSyncProvider(config);
      const res = await syncEngine.upload(
        currentBackupData,
        e2eeEnabled ? masterPassword : undefined
      );
      setSyncStatus(res);
      if (res.success) {
        onUpdateSyncSettings({
          ...config,
          lastSyncTimestamp: res.timestamp || Date.now(),
        });
      }
    } catch (e) {
      setSyncStatus({ success: false, message: `Upload error: ${(e as Error).message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadNow = async () => {
    if (e2eeEnabled && !masterPassword) {
      setSyncStatus({ success: false, message: 'Unlock the session to decrypt synced data.' });
      onRequireUnlock();
      return;
    }
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const config = getCurrentConfig();
      const syncEngine = createSyncProvider(config);
      const res = await syncEngine.download(e2eeEnabled ? masterPassword : undefined);
      setSyncStatus(res);

      if (res.success && res.remoteData) {
        onRestoreBackupData(res.remoteData);
      }
    } catch (e) {
      setSyncStatus({ success: false, message: `Download error: ${(e as Error).message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = () => {
    const config = getCurrentConfig();
    onUpdateSyncSettings(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 text-slate-100"
        id="sync-modal-container"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Cloud Sync & Zero-Backend Architecture
              </h2>
              <p className="text-[11px] text-slate-400">
                100% Client-to-Cloud • E2EE AES-GCM • Zero Centralized Servers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Architecture Guarantee Notice */}
          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Privacy Guarantee: </span>
              OpenDial has zero centralized databases. Your bookmarks, custom dials, notes, and thumbnails are stored directly in your personal cloud storage (Google Drive, OneDrive, or self-hosted Nextcloud WebDAV).
            </div>
          </div>

          {/* E2EE MASTER ENCRYPTION PASSWORD */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  End-to-End Encryption (AES-GCM 256-bit)
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={e2eeEnabled}
                  onChange={(e) => setE2eeEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                />
                <span className="text-emerald-400 font-semibold">E2EE Enabled</span>
              </label>
            </div>

            {e2eeEnabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-300">
                    Session vault is {masterPassword ? 'unlocked' : 'locked'}. The password is memory-only.
                  </span>
                  {!masterPassword && (
                    <button
                      type="button"
                      onClick={onRequireUnlock}
                      className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                    >
                      Unlock
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400">
                    Strength:{' '}
                    <span
                      className={`font-semibold ${
                        passwordStrength.score >= 4
                          ? 'text-emerald-400'
                          : passwordStrength.score >= 3
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </span>
                  <span className="text-slate-500">
                    Data is encrypted locally before upload
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SYNC PROVIDER SELECTOR */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Sync Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setProvider('webdav')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  provider === 'webdav'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Server className="w-4 h-4 mb-2 text-sky-400" />
                <div>
                  <div className="text-xs font-bold">WebDAV</div>
                  <div className="text-[10px] text-slate-400">Nextcloud / Self-hosted</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('gdrive')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  provider === 'gdrive'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Cloud className="w-4 h-4 mb-2 text-blue-400" />
                <div>
                  <div className="text-xs font-bold">Google Drive</div>
                  <div className="text-[10px] text-slate-400">15GB Free Storage</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('onedrive')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  provider === 'onedrive'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Cloud className="w-4 h-4 mb-2 text-indigo-400" />
                <div>
                  <div className="text-xs font-bold">OneDrive</div>
                  <div className="text-[10px] text-slate-400">Microsoft Cloud</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('local')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  provider === 'local'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <HardDrive className="w-4 h-4 mb-2 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold">Local Vault</div>
                  <div className="text-[10px] text-slate-400">Offline .opendial file</div>
                </div>
              </button>
            </div>
          </div>

          {/* PROVIDER SPECIFIC CONFIGURATION */}
          {provider === 'webdav' && (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                WebDAV Connection Credentials
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Server WebDAV URL *
                  </label>
                  <input
                    type="text"
                    value={webdavUrl}
                    onChange={(e) => setWebdavUrl(e.target.value)}
                    placeholder="https://nextcloud.yourdomain.com/remote.php/dav/files/username"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={webdavUser}
                    onChange={(e) => setWebdavUser(e.target.value)}
                    placeholder="e.g. admin or your username"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Password / App Token *
                  </label>
                  <input
                    type="password"
                    value={webdavPass}
                    onChange={(e) => setWebdavPass(e.target.value)}
                    placeholder="Nextcloud App Password"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {provider === 'gdrive' && (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                Google Drive REST Integration
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  OAuth Access Token
                </label>
                <input
                  type="password"
                  value={gdriveToken}
                  onChange={(e) => setGdriveToken(e.target.value)}
                  placeholder="Paste Google Drive OAuth Token (Bearer ...)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Syncs directly to your private Google Drive file: <code>opendial_backup.enc.json</code>.
                </p>
              </div>
            </div>
          )}

          {provider === 'onedrive' && (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Microsoft OneDrive Integration
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Microsoft Graph Access Token
                </label>
                <input
                  type="password"
                  value={onedriveToken}
                  onChange={(e) => setOnedriveToken(e.target.value)}
                  placeholder="Paste Microsoft Graph token..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Syncs to <code>/Apps/OpenDial/opendial_backup.enc.json</code>.
                </p>
              </div>
            </div>
          )}

          {provider === 'local' && (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Local Encrypted Vault
              </div>
              <p className="text-xs text-slate-300">
                Save an encrypted file directly onto your computer disk, USB drive, or private storage.
              </p>
            </div>
          )}

          {/* Test & Manual Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleUploadNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors shadow-md shadow-sky-600/30"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now (Upload)'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-colors"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Restore from Cloud</span>
            </button>
          </div>

          {/* Test or Sync Status Feedback Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {syncStatus && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                syncStatus.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {syncStatus.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{syncStatus.message}</span>
            </div>
          )}

          {syncSettings.lastSyncTimestamp && (
            <div className="text-[11px] text-slate-500">
              Last synced:{' '}
              {new Date(syncSettings.lastSyncTimestamp).toLocaleDateString()}{' '}
              {new Date(syncSettings.lastSyncTimestamp).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors shadow-md shadow-sky-600/30"
          >
            Save Sync Settings
          </button>
        </div>
      </div>
    </div>
  );
};
