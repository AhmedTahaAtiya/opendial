# OpenDial

> **Privacy-first, zero-backend, end-to-end encrypted browser speed dial and productivity cockpit.**

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan.svg?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Encryption](https://img.shields.io/badge/Security-AES--GCM--256-emerald.svg)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
[![Manifest](https://img.shields.io/badge/Extension-Manifest%20V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

---

## ⚡ Overview

**OpenDial** is a modern, serverless startpage and speed dial engine engineered for developers, power users, and privacy advocates. Designed from the ground up to operate entirely inside your browser, OpenDial requires **no proprietary database, accounts, or telemetry servers**.

All dials, folders, notes, and preferences can be synced directly to your own personal storage (such as WebDAV, Nextcloud, or Google Drive) using **client-side AES-GCM 256-bit cryptographic encryption**.

---

## ✨ Key Features

### 🎛️ Architectural Dashboard & Density Modes
- **Station View**: Clean, modular cards with favicon resolution, Firefox container tags, and live click tracking.
- **Compact View**: High-density horizontal cockpit rows designed for maximum throughput and minimal screen footprint.
- **Editorial View**: Expansive wide cards with rich descriptions and domain previews.
- **Adaptive Grid**: Fluid responsive layout scaling seamlessly from 4 to 7 customizable columns.

### 🔐 Zero-Knowledge Cryptography (E2EE)
- **AES-GCM 256-bit Encryption**: Client-side cryptography leveraging standard Web Crypto API (`window.crypto.subtle`).
- **PBKDF2 Key Derivation**: Passphrases salted with 100,000 rounds of PBKDF2-SHA256.
- **BYOS (Bring Your Own Storage)**: Direct synchronization with WebDAV servers (e.g., Nextcloud, ownCloud) and Cloud vaults without intermediate proxy servers.

### 🚀 Speed Dial Types
- **Standard Dials**: Custom thumbnails, background gradients, domain metadata, and Firefox Multi-Account Container badges.
- **Live Dials**: Sandboxed, auto-refreshing iframes with custom scale factors and viewport positioning for live monitoring.
- **Multi-Link Dials**: Bundled groups of related links that can be opened concurrently with a single click.
- **Weather Dials**: Live meteorological telemetry with 5-day forecasts and humidity/wind tracking.
- **Folders**: Hierarchical grouping with custom category colors and badge counters.

### ⌨️ Keyboard Accelerators & Command Console
- **Quick-Launch Hotkeys**: Press `1` through `9` on your keyboard to instantaneously open corresponding dials.
- **Command Search Bar**: Press `/` to focus the search console instantly. Supports prefix routing (`!g`, `!ddg`, `!gh`, `!yt`, `!r`) across major search engines.
- **Productivity Focus Mode**: Toggle focus mode with a single click or shortcut to hide distracting entertainment dials while working.

### 📦 Web Extension Exporter (Manifest V3)
- Export OpenDial as an offline-ready **Chromium (Chrome, Edge, Brave)** or **Firefox** extension (`.zip`) with one click.
- Replaces your browser's default `New Tab` page with your personalized speed dial.

### 🛠️ Built-in Productivity Drawer
- **Pomodoro & Stopwatch**: Configurable focus/break intervals and session timers.
- **Ephemeral Scratchpad**: Quick Markdown-friendly notes saved locally in your browser.
- **Ambient Noise Synthesizer**: Web Audio API soundscapes (white noise, rain, and focus tones) with zero external asset dependencies.

---

## 🏗️ Architecture & Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Runtime                       │
│                                                             │
│  ┌─────────────────┐   ┌─────────────────────────────────┐  │
│  │   UI Console    │   │      Web Crypto API Engine      │  │
│  │ (React 19 + V4) │   │   AES-GCM 256-bit + PBKDF2      │  │
│  └────────┬────────┘   └────────────────┬────────────────┘  │
│           │                             │                   │
│           ▼                             ▼                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            Local Storage / IndexedDB Cache            │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │
               (Encrypted Ciphertext Payload)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Your Personal Storage                    │
│        (Nextcloud / WebDAV / Google Drive / Local ZIP)      │
└─────────────────────────────────────────────────────────────┘
```

1. **Zero Intermediate Servers**: Your bookmarks and secrets are never transmitted to third-party analytics or authentication servers.
2. **Encrypted at Rest**: All exported cloud backup payloads are authenticated ciphertext blocks (`iv`, `salt`, `ciphertext`).
3. **Container Isolation**: Dedicated Firefox Multi-Account Container indicators (Personal, Work, Banking, Shopping) for seamless workflow separation.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `/` | Focus global search console |
| `Esc` | Blur search / close active modal |
| `1` – `9` | Instant quick-launch speed dial #1 through #9 |
| `Shift + P` | Toggle Productivity Focus Mode |
| `Shift + S` | Open Settings & Preferences |
| `Shift + T` | Open Built-in Productivity Tools Drawer |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun** / **pnpm** / **yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AhmedTahaAtiya/opendial.git
   cd opendial
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

4. **Build for production:**
   ```bash
   npm run build
   ```
   The compiled static bundle will be generated in `dist/`.

---

## 🧩 Packing as a Browser Extension

OpenDial comes with a built-in packaging engine:

1. Open **OpenDial** in your browser.
2. Click the **Export** button in the top navigation bar.
3. Select **Manifest V3 Extension (.ZIP)** and click **Generate Extension Package**.
4. Unzip the downloaded file.
5. In **Google Chrome / Brave / Edge**:
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (top right toggle).
   - Click **Load unpacked** and select the unzipped directory.
6. In **Firefox**:
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click **Load Temporary Add-on** and select `manifest.json`.

---

## 💾 Importing & Exporting Data

- **Standard Bookmarks**: Import or export bookmarks using standard HTML format (`Netscape Bookmark File 1`), compatible with Chrome, Safari, Firefox, and Edge.
- **Encrypted JSON Vault**: Create a portable, password-protected `.json` backup containing all your dials, custom thumbnails, folders, and workspace configurations.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Motion](https://motion.dev/)
- **Compression**: [JSZip](https://stuk.github.io/jszip/)
- **Cryptography**: Native [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

---

## 🤝 Contributing

Contributions, feature ideas, and pull requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.
