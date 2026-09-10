# Contributing to OpenDial

Thank you for your interest in contributing to OpenDial! This document outlines the workflow and standards for contributions.

## Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/AhmedTahaAtiya/opendial.git
   cd opendial
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

## Code Quality Standards

OpenDial enforces the following quality gates. Run them all before submitting a PR:

```bash
npm run test:all
```

This runs:

1. **Type checking** — `tsc --noEmit`
2. **Linting** — `eslint .`
3. **Formatting** — `prettier --check .`
4. **Unit tests** — `tsx --test src/services/*.test.ts`
5. **Extension tests** — `npm run test:extension`

You can also fix issues automatically:

```bash
npm run lint:fix   # auto-fix lint + type errors
npm run format     # auto-format all files with Prettier
```

### Style Guide

- **Prettier** handles formatting (2-space indent, 100-char line width, single quotes, semicolons, trailing commas).
- **TypeScript** strict mode is enabled. All new code must pass `tsc --noEmit`.
- **ESLint** enforces no unused vars, `prefer-const`, `no-var`, and warnings on `console`.
- Avoid `any` — use `unknown` or proper type narrowing.

## Testing

Tests use Node's built-in `node:test` runner (no Jest dependency). Test files live alongside their source as `*.test.ts`.

- **Unit tests:** `npm test`
- **Extension build validation:** `npm run test:extension` (builds the MV3 extension and validates the manifest, CSP, and that no external URLs or secrets leak into the artifact)

New features should be covered by tests, especially:

- Crypto operations (encryption/decryption round-trips, tamper detection)
- Backup sanitization (credential stripping, version migration)
- URL validation (protocol allowlist)
- Storage operations

## Pull Request Workflow

1. **Create a branch** from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** — follow the code style and add tests.

3. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):

   ```
   feat: add dark mode toggle
   fix: prevent null crash in DialCard
   docs: update encryption threat model
   ```

4. **Push and open a PR:**

   ```bash
   git push origin feat/your-feature-name
   ```

5. **CI will run automatically.** All checks must pass (typecheck, lint, format, tests, security audit) before merge.

## Security

OpenDial is a zero-knowledge application — **no server ever sees plaintext user data**. When contributing, keep these invariants sacred:

- **Never commit credentials, API keys, or `.env` files.**
- Cloud uploads must always encrypt client-side with the master password before `fetch`.
- Cloud downloads must reject plaintext payloads.
- Sync credentials (WebDAV passwords, OAuth tokens) must be stored separately from portable app data and excluded from exports/backups.
- Dial URLs must be validated to `http:` or `https:` protocols only.
- The browser extension must request zero unnecessary permissions (no `tabs`, `bookmarks`, `storage`, `contextualIdentities`).

See [`docs/encryption.md`](docs/encryption.md) for the full threat model.

## Architecture Overview

```
src/
├── App.tsx                    # Root component (orchestrates all hooks)
├── main.tsx                   # React entry point
├── index.css                  # Tailwind + custom scrollbar styles
├── components/                # React components (dials, modals, navbar)
│   ├── DialCard.tsx           # Main dial card (all dial types)
│   ├── DialGrid.tsx           # Grid layout + filtering
│   ├── Navbar.tsx             # Top navigation bar
│   ├── SearchBar.tsx          # Command-line search console
│   ├── SettingsModal.tsx      # Preferences & themes
│   ├── SyncModal.tsx          # Cloud sync configuration
│   ├── ImportExportModal.tsx  # Backup import/export + extension export
│   ├── EditDialModal.tsx      # Add/edit dial form
│   ├── NewFolderModal.tsx     # Folder creation
│   ├── WidgetsModal.tsx       # Pomodoro, stopwatch, notes
│   ├── UnlockModal.tsx        # Master password unlock
│   └── dials/                 # Specialized dial card components
├── hooks/                     # Custom React hooks (state management)
├── services/                  # Business logic (crypto, backup, storage, sync)
├── data/                      # Static data (initial state, search engines)
└── types/                     # TypeScript type definitions
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License. See [`LICENSE`](LICENSE).
