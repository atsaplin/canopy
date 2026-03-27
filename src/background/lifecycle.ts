import type { StorageManager } from "@background/storage/StorageManager";

/** Handle extension install and update lifecycle events. */
export function setupLifecycle(storage: StorageManager): void {
  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
      // Open onboarding page on first install
      chrome.tabs.create({
        url: chrome.runtime.getURL("src/ui/onboarding/index.html"),
      });
    }

    if (details.reason === "update") {
      // Run storage migrations on extension update
      await storage.runMigrations();
    }
  });
}
