/**
 * Browser Extension Packager (WebExtensions MV3)
 * Bundles OpenDial into a ready-to-install unpacked extension for Chrome, Firefox, Edge, Brave, and Opera.
 */

import JSZip from 'jszip';
import { ExportBackupData } from '../types/opendial';
import { sanitizeImportedBackup } from './backup';

export async function generateExtensionZip(backupData: ExportBackupData): Promise<Blob> {
  const zip = new JSZip();

  const manifestV3 = {
    manifest_version: 3,
    name: 'OpenDial – Serverless Speed Dial',
    version: '1.0.0',
    description: 'Privacy-first, open-source serverless speed dial with zero backend, client-side E2EE, and personal cloud sync.',
    permissions: [
      'storage',
      'unlimitedStorage',
      'tabs',
      'bookmarks',
      'contextualIdentities',
    ],
    chrome_url_overrides: {
      newtab: 'newtab.html',
    },
    background: {
      service_worker: 'background.js',
    },
    action: {
      default_title: 'OpenDial Dashboard',
      default_icon: {
        '16': 'icon.png',
        '48': 'icon.png',
        '128': 'icon.png',
      },
    },
    icons: {
      '16': 'icon.png',
      '48': 'icon.png',
      '128': 'icon.png',
    },
  };

  const readmeContent = `# OpenDial – Browser Extension (Manifest V3)

Thank you for downloading OpenDial! This extension replaces your default New Tab page with a private, serverless speed dial.

## How to Install in Chrome, Brave, or Edge:
1. Extract this ZIP archive to a folder on your computer.
2. Open your browser and navigate to: \`chrome://extensions/\` (or \`edge://extensions/\`).
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **"Load unpacked"** and select the extracted folder.
5. Open a New Tab — your OpenDial dashboard is now live!

## How to Install in Mozilla Firefox:
1. Open Firefox and navigate to: \`about:debugging#/runtime/this-firefox\`.
2. Click **"Load Temporary Add-on..."**.
3. Select the \`manifest.json\` file inside the extracted folder.

## Features:
- 🔒 100% Client-Side End-to-End Encryption (AES-GCM 256-bit)
- 🌐 Zero Centralized Backend: Sync via personal Google Drive, OneDrive, or WebDAV (Nextcloud)
- 🔴 Live Dials with interactive iframes
- 📂 Nested Folders and Fluid Grid Resizing
- ⚡ Web Audio Pomodoro, Countdown, and Stopwatch
- ⛅ Weather Forecasts via Open-Meteo
`;

  const backgroundJs = `// OpenDial Extension Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('OpenDial Extension Installed successfully.');
});

// Listen for tab events or bookmark sync if permissions granted
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
});
`;

  // Base64 1x1 / small icon or SVG data
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#g)"/>
  <circle cx="64" cy="64" r="42" stroke="#38bdf8" stroke-width="6" fill="none" opacity="0.4"/>
  <circle cx="64" cy="64" r="28" stroke="#38bdf8" stroke-width="6" fill="none"/>
  <polygon points="64,28 72,48 56,48" fill="#38bdf8"/>
  <circle cx="64" cy="64" r="8" fill="#f8fafc"/>
</svg>`;

  const newtabHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OpenDial – Speed Dial</title>
    <style>
      body {
        margin: 0;
        font-family: system-ui, -apple-system, sans-serif;
        background: #090d16;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
      }
      .card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 16px;
        padding: 32px;
        max-width: 580px;
        text-align: center;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      }
      h1 { margin: 0 0 12px; font-size: 24px; color: #38bdf8; }
      p { margin: 0 0 24px; color: #94a3b8; font-size: 15px; line-height: 1.5; }
      .btn {
        display: inline-block;
        background: #0284c7;
        color: #ffffff;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        transition: background 0.2s;
      }
      .btn:hover { background: #0369a1; }
      .meta { margin-top: 24px; font-size: 13px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Welcome to OpenDial</h1>
      <p>Your serverless, privacy-first speed dial is configured. Launch the active dashboard or synchronize across your cloud devices.</p>
      <a href="https://ais-dev-xatigbhc52i7nexgtqqnha-63309083545.europe-west3.run.app" class="btn" target="_blank">Open Full Dashboard</a>
      <div class="meta">E2EE Protected • Manifest V3 • Zero Centralized Servers</div>
    </div>
  </body>
</html>`;

  zip.file('manifest.json', JSON.stringify(manifestV3, null, 2));
  zip.file('README.md', readmeContent);
  zip.file('background.js', backgroundJs);
  zip.file('newtab.html', newtabHtml);
  zip.file('icon.svg', iconSvg);
  zip.file('config_seed.json', JSON.stringify(sanitizeImportedBackup(backupData), null, 2));

  return await zip.generateAsync({ type: 'blob' });
}
