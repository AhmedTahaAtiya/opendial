import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileCode,
  Lock,
  Package,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { ExportBackupData, DialItem } from '../types/opendial';
import { encryptData, decryptData } from '../services/crypto';
import { generateExtensionZip } from '../services/extensionExporter';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBackupData: ExportBackupData;
  onRestoreData: (data: ExportBackupData) => void;
  onAppendDials: (dials: DialItem[]) => void;
  masterPassword?: string;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  currentBackupData,
  onRestoreData,
  onAppendDials,
  masterPassword,
}) => {
  const [exportPassword, setExportPassword] = useState(masterPassword || '');
  const [encryptExport, setEncryptExport] = useState(true);
  const [importPassword, setImportPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isGeneratingExtension, setIsGeneratingExtension] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bookmarkInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Export JSON or E2EE Encrypted file
  const handleExportBackup = async () => {
    try {
      let content: string;
      let filename = `opendial-backup-${new Date().toISOString().slice(0, 10)}.json`;

      if (encryptExport) {
        if (!exportPassword) {
          setStatusMessage({ type: 'error', text: 'Passphrase required for encrypted export' });
          return;
        }
        const encrypted = await encryptData(currentBackupData, exportPassword);
        content = JSON.stringify(encrypted, null, 2);
        filename = `opendial-e2ee-${new Date().toISOString().slice(0, 10)}.opendial`;
      } else {
        content = JSON.stringify(currentBackupData, null, 2);
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

      setStatusMessage({ type: 'success', text: `Exported ${filename} successfully!` });
    } catch (e) {
      setStatusMessage({ type: 'error', text: `Export failed: ${(e as Error).message}` });
    }
  };

  // Import OpenDial JSON or .opendial
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.isEncrypted) {
        if (!importPassword) {
          setStatusMessage({
            type: 'error',
            text: 'File is encrypted. Please enter the master passphrase below and re-select.',
          });
          return;
        }
        const decrypted = await decryptData<ExportBackupData>(parsed, importPassword);
        onRestoreData(decrypted);
        setStatusMessage({ type: 'success', text: 'Encrypted backup decrypted and restored!' });
      } else if (parsed.dials && Array.isArray(parsed.dials)) {
        onRestoreData(parsed);
        setStatusMessage({ type: 'success', text: `Restored ${parsed.dials.length} speed dials!` });
      } else {
        setStatusMessage({ type: 'error', text: 'Unrecognized backup file format.' });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: `Import failed: ${(e as Error).message}` });
    }
  };

  // Import HTML Bookmarks (Chrome, Firefox, Safari standard export)
  const handleBookmarkHtmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const links = doc.querySelectorAll('a');

      const importedDials: DialItem[] = [];
      links.forEach((a, i) => {
        const url = a.getAttribute('href');
        const title = a.textContent?.trim();
        if (url && title && /^https?:\/\//i.test(url)) {
          importedDials.push({
            id: `imported_${Date.now()}_${i}`,
            title: title.slice(0, 40),
            url,
            type: 'standard',
            tags: ['bookmark'],
            createdAt: Date.now(),
          });
        }
      });

      if (importedDials.length > 0) {
        onAppendDials(importedDials);
        setStatusMessage({
          type: 'success',
          text: `Imported ${importedDials.length} bookmarks into your Speed Dial!`,
        });
      } else {
        setStatusMessage({ type: 'error', text: 'No valid HTTP/HTTPS bookmarks found in file.' });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: `Bookmark parse failed: ${(e as Error).message}` });
    }
  };

  // Download Manifest V3 WebExtension Zip
  const handleDownloadExtension = async () => {
    setIsGeneratingExtension(true);
    try {
      const blob = await generateExtensionZip(currentBackupData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'opendial-extension-mv3.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage({
        type: 'success',
        text: 'Downloaded opendial-extension-mv3.zip! Unpack and load into Chrome/Firefox.',
      });
    } catch (e) {
      setStatusMessage({ type: 'error', text: `Extension pack failed: ${(e as Error).message}` });
    } finally {
      setIsGeneratingExtension(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 text-slate-100"
        id="import-export-modal-container"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-slate-100">
              Backup, Portability & Extension Package
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* SECTION 1: DOWNLOAD EXTENSION PACKAGE */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/50 to-indigo-950/50 border border-sky-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                Download Browser Extension (Manifest V3)
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Package OpenDial with your current bookmarks and dials into an unpacked extension ZIP. Ready to install in Chrome, Brave, Firefox, or Edge.
            </p>
            <button
              type="button"
              onClick={handleDownloadExtension}
              disabled={isGeneratingExtension}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/30"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingExtension ? 'Packaging ZIP...' : 'Export Extension (.ZIP)'}</span>
            </button>
          </div>

          {/* SECTION 2: EXPORT BACKUP */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Export OpenDial Vault
            </div>
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={encryptExport}
                  onChange={(e) => setEncryptExport(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700"
                />
                <span>Encrypt with AES-GCM 256-bit</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {encryptExport ? '.opendial vault' : '.json file'}
              </span>
            </div>

            {encryptExport && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Export Passphrase
                </label>
                <input
                  type="password"
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  placeholder="Passphrase to protect this export file"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Vault File</span>
            </button>
          </div>

          {/* SECTION 3: IMPORT BACKUP & BOOKMARKS */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Import & Migration
            </div>

            {/* Password for encrypted imports */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Decryption Passphrase (if importing .opendial encrypted vault)
              </label>
              <input
                type="password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="Master password of the imported file"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {/* Import OpenDial or JSON */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,.opendial"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restore OpenDial Backup (.json / .opendial)</span>
              </button>

              {/* Import HTML bookmarks */}
              <input
                type="file"
                ref={bookmarkInputRef}
                accept=".html,.htm"
                onChange={handleBookmarkHtmlUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => bookmarkInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Import Chrome / Firefox Bookmarks (HTML)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
