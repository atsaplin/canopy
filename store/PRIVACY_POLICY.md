# Privacy Policy for Canopy

**Last updated:** March 26, 2026

## Overview

Canopy is a Chrome extension that organizes browser tabs as a tree. Your privacy is important — Canopy is designed to work entirely locally with no external data collection.

## Data Collection

**Canopy does not collect, transmit, or share any personal data.**

Specifically:
- No analytics or tracking of any kind
- No external network requests
- No user accounts or authentication
- No data sent to any server

## Data Storage

Canopy stores the following data locally on your device using Chrome's built-in `chrome.storage.local` API:

- **Tab parent-child relationships** — which tabs are children of which other tabs
- **Collapsed/expanded state** — which tree nodes you've collapsed
- **Saved sessions** — tab trees you've explicitly saved (names, URLs, titles, tree structure)
- **Tab activity timestamps** — when you last visited each tab (for decay visualization)

This data never leaves your browser. It is not accessible to any website or external service.

## Permissions

Canopy requests the following Chrome permissions:

| Permission | Why |
|---|---|
| `tabs` | Read tab titles, URLs, and status to display in the tree view |
| `tabGroups` | Read and manage Chrome tab groups |
| `bookmarks` | Search bookmarks when you use the search feature |
| `storage` | Save your tree structure, sessions, and preferences locally |
| `sidePanel` | Display the tree view in Chrome's side panel |

## Third-Party Services

Canopy does not use any third-party services, SDKs, or APIs. The extension operates entirely within your browser.

## Extension API

Canopy exposes an optional Extension API that allows other Chrome extensions (installed by you) to query your tab tree. This communication happens entirely within Chrome's extension messaging system and never touches any external network.

## Data Deletion

Uninstalling Canopy automatically removes all stored data. You can also clear data manually via Chrome's extension settings.

## Changes

If this privacy policy changes, the update will be published with a new version of the extension.

## Contact

For questions about this privacy policy, open an issue on the project's GitHub repository.
