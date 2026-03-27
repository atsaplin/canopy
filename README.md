# Canopy — Tree Style Tabs for Chrome

A Chrome extension that organizes your tabs as a tree in the side panel — with drag-and-drop hierarchy, session save/restore, AI context export, and tab staleness tracking.

## Features

- **Tree View** — Tabs displayed as an indented tree with parent-child relationships, collapsible subtrees, and drag-and-drop reordering
- **Session Management** — Save, restore, export, and import tab sessions as portable JSON files
- **Multi-Select** — Click, Shift+click range, Ctrl/Cmd+click toggle for bulk operations
- **Copy & Export** — One-click copy as JSON or as structured markdown for AI assistants
- **Tab Staleness** — Tabs dim after a configurable threshold with relative timestamps (e.g. "2h", "3d")
- **Search** — Instant search across tabs and bookmarks with keyboard-navigable results
- **Keyboard Driven** — Alt+S toggles the panel, arrow keys navigate, Enter activates, Delete closes
- **Settings** — Configurable indent size, stale threshold, decay indicators, and close confirmation
- **Dark/Light Mode** — Follows your system preference
- **Extension API** — Other extensions can query and interact with Canopy's tab tree

## Install

### From Chrome Web Store

Coming soon.

### From Source

```bash
git clone https://github.com/atsaplin/canopy.git
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
├── ui/            # React — side panel, options, onboarding, components, stores
└── shared/        # Typed messages and events
```

## Privacy

All data stays local in `chrome.storage`. No external servers, no tracking, no analytics. See [Privacy Policy](store/PRIVACY_POLICY.md).
