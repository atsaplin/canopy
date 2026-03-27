import type { StorageManager } from "@background/storage/StorageManager";

/** Handle extension install and update lifecycle events. */
export function setupLifecycle(storage: StorageManager): void {
  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
      // Open side panel on first install
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.windowId) {
          await chrome.sidePanel.open({ windowId: tab.windowId });
        }
      } catch {
        // Side panel may not be available in all contexts
      }
    }

    if (details.reason === "update") {
      // Run storage migrations on extension update
      await storage.runMigrations();
    }
  });
}
