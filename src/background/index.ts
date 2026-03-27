import { StorageManager, ChromeStorageBackend } from "@background/storage/StorageManager";
import { TabParentTracker } from "@background/services/TabParentTracker";
import { setupMessageHandler } from "@background/messageHandler";
import { setupLifecycle } from "@background/lifecycle";
import { broadcast } from "@background/broadcast";
import { setupAPIHandler } from "@background/apiHandler";

// Initialize storage and services
const storage = new StorageManager(new ChromeStorageBackend());
const tracker = new TabParentTracker(storage);

// Initialize on service worker activation
async function init(): Promise<void> {
  await tracker.init();
  broadcast({ type: "SW_READY" });
}

init();

// Set up lifecycle (install/update handlers)
setupLifecycle(storage);

// Set up message handler for UI write operations
setupMessageHandler(tracker, storage);

// Set up external extension API
setupAPIHandler(tracker, storage);

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (tab.windowId !== undefined) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  } catch {
    // Side panel may not be available
  }
});

// Handle special messages from onboarding/options pages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === "OPEN_SIDE_PANEL") {
    chrome.windows.getCurrent().then(async (window) => {
      if (window.id !== undefined) {
        await chrome.sidePanel.open({ windowId: window.id });
      }
      sendResponse({ success: true });
    }).catch(() => sendResponse({ success: false }));
    return true;
  }
  return false;
});

// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "focus-search" || command === "copy-context" || command === "save-session") {
    // Open side panel first, then broadcast the command to the UI
    try {
      const window = await chrome.windows.getCurrent();
      if (window.id !== undefined) {
        await chrome.sidePanel.open({ windowId: window.id });
      }
    } catch {
      // Side panel may not be available
    }
    // Broadcast the command so the side panel UI can handle it
    broadcast({ type: "COMMAND", command });
  }
});

// Chrome tab event listeners → broadcast as domain events
chrome.tabs.onCreated.addListener(async (tab) => {
  await tracker.onTabCreated(tab);
  broadcast({ type: "TAB_CREATED", tab });
  // Broadcast updated parent map so UI stays in sync
  if (tab.openerTabId !== undefined) {
    broadcast({ type: "PARENT_MAP_CHANGED", parentMap: tracker.getParentMap() });
  }
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  await tracker.onTabRemoved(tabId);
  // Clean up activity tracking for closed tabs (prevents storage leak)
  storage.removeTabActivity(tabId).catch(() => {});
  broadcast({ type: "TAB_REMOVED", tabId, windowId: removeInfo.windowId });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  broadcast({ type: "TAB_UPDATED", tabId, changeInfo, tab });
});

chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  broadcast({ type: "TAB_MOVED", tabId, moveInfo });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  // Track tab activity for decay detection
  storage.recordTabAccess(activeInfo.tabId).catch(() => {});

  broadcast({
    type: "TAB_ACTIVATED",
    tabId: activeInfo.tabId,
    windowId: activeInfo.windowId,
  });
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  broadcast({ type: "TAB_ATTACHED", tabId, attachInfo });
});

chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
  broadcast({ type: "TAB_DETACHED", tabId, detachInfo });
});

// Tab group events (graceful when unavailable)
if (chrome.tabGroups) {
  chrome.tabGroups.onCreated?.addListener((group) => {
    broadcast({ type: "GROUP_CREATED", group });
  });

  chrome.tabGroups.onRemoved?.addListener((group) => {
    broadcast({ type: "GROUP_REMOVED", groupId: group.id });
  });

  chrome.tabGroups.onUpdated?.addListener((group) => {
    broadcast({ type: "GROUP_UPDATED", group });
  });
}

export {};
