# Canopy — Tree Style Tabs for Chrome

A Chrome extension that organizes your tabs as a tree in the side panel — with drag-and-drop hierarchy, session save/restore, AI context export, and tab decay visualization.

## Features

- **Tree View** — Tabs displayed as an indented tree with parent-child relationships, collapsible subtrees, and drag-and-drop reordering
- **Session Management** — Save, restore, export, and import tab sessions as portable JSON files
- **Multi-Select** — Click, Shift+click range, Ctrl/Cmd+click toggle for bulk operations
- **AI Context Export** — One-click copy of your tab tree as structured markdown for AI assistants
- **Tab Decay** — Unused tabs dim over time so you can spot forgotten tabs at a glance
- **Search** — Instant regex search across tabs and bookmarks with a command palette popup
- **Keyboard Navigation** — Full arrow key navigation, Enter to activate, Delete to close
- **Two UIs** — Side panel (Alt+S) for the full tree, popup (Alt+Q) for quick switching
- **Dark/Light Mode** — Follows your system preference
- **Extension API** — Other extensions can query and interact with Canopy's tab tree

## Install

### From Chrome Web Store

Coming soon.

### From Source

```bash
git clone https://github.com/AAlceste/canopy.git
cd canopy
npm install
npm run build
```

Then load `dist/` as an unpacked extension at `chrome://extensions` (enable Developer mode).

### Development

```bash
npm run dev     # Start dev server with HMR
npm test        # Run unit tests
npm run test:e2e # Run Playwright e2e tests
```

## Tech Stack

Vite 6 · CRXJS · React 19 · TypeScript · Zustand · Tailwind CSS 4 · dnd-kit · @tanstack/react-virtual

## Architecture

```
src/
├── core/          # Pure functions — tree building, search, serialization (no Chrome/React)
├── background/    # Service worker — storage, events, message handling
├── ui/            # React — side panel, popup, components, stores
└── shared/        # Typed messages and events
```

## Privacy

All data stays local in `chrome.storage`. No external servers, no tracking, no analytics. See [Privacy Policy](store/PRIVACY_POLICY.md).
