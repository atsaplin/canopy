import type { WriteMessage, WriteResponse } from "@shared/types/messages";
import { isWriteMessage } from "@shared/types/messages";
import type { TabParentTracker } from "@background/services/TabParentTracker";
import { broadcast } from "@background/broadcast";
import type { TabGroupColor } from "@core/types";
import type { StorageManager } from "@background/storage/StorageManager";
import { serializeTree } from "@core/SessionSerializer";
import { SessionRestorer } from "@background/services/SessionRestorer";
import { buildTree } from "@core/TreeBuilder";

const VALID_GROUP_COLORS = new Set<string>([
  "grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange",
]);

/** Set up the message handler for write operations from UI. */
export function setupMessageHandler(tracker: TabParentTracker, storage: StorageManager): void {
  chrome.runtime.onMessage.addListener(
    (message: unknown, _sender, sendResponse: (response: WriteResponse) => void) => {
      if (!isWriteMessage(message)) return false;

      handleMessage(message, tracker, storage)
        .then(sendResponse)
        .catch((err: Error) => {
          sendResponse({
            success: false,
            error: err.message,
            code: "UNKNOWN_ERROR",
          });
        });

      return true; // Keep channel open for async response
    },
  );
}

async function handleMessage(
  message: WriteMessage,
  tracker: TabParentTracker,
  storage: StorageManager,
): Promise<WriteResponse> {
  try {
    switch (message.action) {
      case "MOVE_TAB": {
        await chrome.tabs.move(message.tabId, message.moveProperties);
        return { success: true };
      }

      case "REPARENT_TAB": {
        if (message.newParentId === null) {
          await tracker.removeParent(message.tabId);
        } else {
          await tracker.setParent(message.tabId, message.newParentId);
        }
        broadcast({
          type: "PARENT_MAP_CHANGED",
          parentMap: tracker.getParentMap(),
        });
        return { success: true };
      }

      case "GROUP_TABS": {
        if (message.tabIds.length === 0) {
          return { success: false, error: "tabIds must not be empty", code: "INVALID_OPERATION" };
        }
        const tabIds = message.tabIds as [number, ...number[]];
        const groupId = await chrome.tabs.group({
          tabIds,
          groupId: message.groupId,
        });
        if (message.title || message.color) {
          const updateProps: chrome.tabGroups.UpdateProperties = {};
          if (message.title) updateProps.title = message.title;
          if (message.color && VALID_GROUP_COLORS.has(message.color)) {
            updateProps.color = message.color as TabGroupColor;
          }
          await chrome.tabGroups.update(groupId, updateProps);
        }
        return { success: true, data: { groupId } };
      }

      case "UNGROUP_TAB": {
        await chrome.tabs.ungroup(message.tabId);
        return { success: true };
      }

      case "CLOSE_TAB": {
        await chrome.tabs.remove(message.tabId);
        return { success: true };
      }

      case "CLOSE_TAB_TREE": {
        // Merge UI-provided descendants with service worker's parent map knowledge
        const swDescendants = tracker.getAllDescendants(message.tabId);
        const allDescendants = new Set([...message.descendantIds, ...swDescendants]);
        const allIds = [message.tabId, ...allDescendants];

        // Clean up parent map first
        await tracker.onTreeRemoved(message.tabId);

        // Close all tabs in one batch
        await chrome.tabs.remove(allIds);
        return { success: true };
      }

      case "SAVE_SESSION": {
        // Build tree from current tabs
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const parentMap = tracker.getParentMap();
        const groups = chrome.tabGroups
          ? await chrome.tabGroups.query({})
          : [];
        const tree = buildTree(
          tabs.map((t) => ({
            id: t.id ?? 0,
            title: t.title ?? "",
            url: t.url ?? "",
            favIconUrl: t.favIconUrl,
            active: t.active ?? false,
            index: t.index,
            groupId: t.groupId,
            openerTabId: t.openerTabId,
            status: t.status as "loading" | "complete" | "unloaded" | undefined,
          })),
          parentMap,
          groups.map((g) => ({
            id: g.id,
            title: g.title,
            color: g.color as TabGroupColor,
            collapsed: g.collapsed,
          })),
        );
        const session = serializeTree(tree, message.name);
        const id = await storage.saveSession(session);
        broadcast({ type: "SESSION_SAVED", id, name: message.name });
        return { success: true, data: { id } };
      }

      case "IMPORT_SESSION": {
        const id = await storage.saveSession(message.session);
        broadcast({ type: "SESSION_SAVED", id, name: message.session.name });
        return { success: true, data: { id } };
      }

      case "LIST_SESSIONS": {
        const sessions = await storage.listSessions();
        return { success: true, data: { sessions } };
      }

      case "GET_SESSION": {
        const session = await storage.getSession(message.id);
        if (!session) {
          return { success: false, error: "Session not found", code: "SESSION_NOT_FOUND" };
        }
        return { success: true, data: { session } };
      }

      case "RESTORE_SESSION": {
        const session = await storage.getSession(message.id);
        if (!session) {
          return { success: false, error: "Session not found", code: "SESSION_NOT_FOUND" };
        }
        const restorer = new SessionRestorer(tracker);
        await restorer.restore(session, message.mode);
        return { success: true };
      }

      case "DELETE_SESSION": {
        await storage.deleteSession(message.id);
        broadcast({ type: "SESSION_DELETED", id: message.id });
        return { success: true };
      }

      case "GET_TAB_ACTIVITY": {
        const activity = await storage.getTabActivity();
        return { success: true, data: { activity } };
      }

      case "ARCHIVE_TABS": {
        // Save the tabs as a session first, then close them
        const tabsToArchive = await chrome.tabs.query({ currentWindow: true });
        const archiveTabs = tabsToArchive.filter((t) => t.id && message.tabIds.includes(t.id));

        if (archiveTabs.length > 0) {
          // Build a mini tree from just these tabs
          const parentMap = tracker.getParentMap();
          const groups = chrome.tabGroups ? await chrome.tabGroups.query({}) : [];
          const tree = buildTree(
            archiveTabs.map((t) => ({
              id: t.id ?? 0, title: t.title ?? "", url: t.url ?? "",
              favIconUrl: t.favIconUrl, active: t.active ?? false, index: t.index,
              groupId: t.groupId, openerTabId: t.openerTabId,
              status: t.status as "loading" | "complete" | "unloaded" | undefined,
            })),
            parentMap,
            groups.map((g) => ({
              id: g.id, title: g.title, color: g.color as TabGroupColor,
              collapsed: g.collapsed,
            })),
          );
          const session = serializeTree(tree, `Archived ${new Date().toLocaleDateString()}`);
          await storage.saveSession(session);

          // Close the archived tabs
          await chrome.tabs.remove(message.tabIds);
        }
        return { success: true };
      }

      default:
        return {
          success: false,
          error: "Unknown action",
          code: "INVALID_OPERATION",
        };
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error, code: "CHROME_API_ERROR" };
  }
}
