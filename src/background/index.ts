import { StorageManager, ChromeStorageBackend } from "@background/storage/StorageManager";
import { TabParentTracker } from "@background/services/TabParentTracker";
import { setupMessageHandler } from "@background/messageHandler";
import { setupLifecycle } from "@background/lifecycle";
import { broadcast } from "@background/broadcast";
import { setupAPIHandler } from "@background/apiHandler";

// Initialize storage and services
const storage = new StorageManager(new ChromeStorageBackend());
const tracker = new TabParentTracker(storage);

// Gate all event processing until init completes (Bug 3 fix)
const initPromise = (async () => {
  await tracker.init();
  broadcast({ type: "SW_READY" });
})();

// Set up lifecycle (install/update handlers)
setupLifecycle(storage);

// Set up message handler for UI write operations
setupMessageHandler(tracker, storage);

// Set up external extension API
setupAPIHandler(tracker, storage);

// Track side panel open state per window for toggle behavior
const sidePanelOpen = new Map<number, boolean>();

// Toggle side panel when extension icon is clicked (Alt+S)
chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (tab.windowId === undefined) return;
    if (sidePanelOpen.get(tab.windowId)) {
      // Panel is open — close it by disabling then re-enabling
      await chrome.sidePanel.setOptions({ enabled: false });
      sidePanelOpen.set(tab.windowId, false);
      // Re-enable immediately so it can be opened again
      await chrome.sidePanel.setOptions({ enabled: true, path: "src/ui/sidepanel/index.html" });
    } else {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      sidePanelOpen.set(tab.windowId, true);
    }
  } catch {
    // Side panel may not be available
  }
});

// Handle special messages from UI pages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === "OPEN_SIDE_PANEL") {
    chrome.windows.getCurrent().then(async (window) => {
      if (window.id !== undefined) {
        await chrome.sidePanel.open({ windowId: window.id });
        sidePanelOpen.set(window.id, true);
      }
      sendResponse({ success: true });
    }).catch(() => sendResponse({ success: false }));
    return true;
  }
  if (message?.action === "SIDE_PANEL_OPENED") {
    if (typeof message.windowId === "number") {
      sidePanelOpen.set(message.windowId, true);
    }
    return false;
  }
  if (message?.action === "SIDE_PANEL_CLOSED") {
    if (typeof message.windowId === "number") {
      sidePanelOpen.set(message.windowId, false);
    }
    return false;
  }
  return false;
});

// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "focus-search" || command === "copy-context" || command === "save-session") {
    try {
      const window = await chrome.windows.getCurrent();
      if (window.id !== undefined) {
        await chrome.sidePanel.open({ windowId: window.id });
        sidePanelOpen.set(window.id, true);
      }
    } catch {
      // Side panel may not be available
    }
    // Signal the command via storage — more reliable than broadcast since
    // storage change events are guaranteed to reach open extension pages
    await chrome.storage.local.set({ canopy_command: { command, timestamp: Date.now() } });
  }
});

/** URLs that indicate a genuinely new tab (not opened from a link). */
const NEW_TAB_URLS = new Set([
  "chrome://newtab/",
  "chrome://new-tab-page/",
  "about:blank",
  "about:newtab",
  "",
]);

// Chrome tab event listeners → broadcast as domain events
chrome.tabs.onCreated.addListener(async (tab) => {
  await initPromise; // Bug 3 fix: wait for init before processing
  if (tab.pendingUrl && NEW_TAB_URLS.has(tab.pendingUrl)) {
    // Ctrl+T or address bar tab — skip parenting
  } else if (tab.url && NEW_TAB_URLS.has(tab.url)) {
    // Same check for url field
  } else {
    if (!tracker.isRestoring) {
      await tracker.onTabCreated(tab);
    }
  }
  broadcast({ type: "TAB_CREATED", tab });
  if (tab.openerTabId !== undefined && !NEW_TAB_URLS.has(tab.pendingUrl ?? "") && !NEW_TAB_URLS.has(tab.url ?? "")) {
    broadcast({ type: "PARENT_MAP_CHANGED", parentMap: tracker.getParentMap() });
  }
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  await initPromise;
  await tracker.onTabRemoved(tabId);
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
