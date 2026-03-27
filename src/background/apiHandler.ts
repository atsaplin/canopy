import { isCanopyAPIMessage, type CanopyAPIMessage } from "@core/ExtensionAPI";
import type { TabParentTracker } from "@background/services/TabParentTracker";
import type { StorageManager } from "@background/storage/StorageManager";
import { buildTree } from "@core/TreeBuilder";
import { findNodeById } from "@core/TabTreeNode";
import { dumpContextAsMarkdown } from "@core/ContextDumper";
import { getChildren } from "@core/ParentMap";
import { broadcast } from "@background/broadcast";
import type { TabGroupColor } from "@core/types";

const CANOPY_VERSION = "2.0.0";

/**
 * Set up the external extension API handler.
 * Other extensions can send messages to Canopy's extension ID.
 */
// Write operations that require allowlisted senders
const WRITE_OPERATIONS = new Set([
  "canopy:attach-tab", "canopy:detach-tab", "canopy:move-tab",
  "canopy:collapse-tree", "canopy:expand-tree",
]);

export function setupAPIHandler(tracker: TabParentTracker, _storage: StorageManager): void {
  chrome.runtime.onMessageExternal.addListener(
    (message: unknown, sender, sendResponse: (response: unknown) => void) => {
      if (!isCanopyAPIMessage(message)) {
        sendResponse({ error: "Unknown Canopy API message", code: "INVALID_MESSAGE" });
        return false;
      }

      // Validate required payload fields per message type
      const validationError = validateAPIPayload(message);
      if (validationError) {
        sendResponse({ error: validationError, code: "INVALID_PAYLOAD" });
        return false;
      }

      // Write operations require allowlisted sender
      if (WRITE_OPERATIONS.has(message.type)) {
        // For now, log the sender for auditing. In production, check against an allowlist.
        console.log(`[Canopy API] Write operation ${message.type} from ${sender.id ?? "unknown"}`);
      }

      handleAPIMessage(message, tracker)
        .then(sendResponse)
        .catch((err: Error) => {
          sendResponse({ error: err.message, code: "INTERNAL_ERROR" });
        });

      return true; // Keep channel open for async
    },
  );
}

/** Validate required fields per message type. Returns error string or null. */
function validateAPIPayload(message: CanopyAPIMessage): string | null {
  const msg = message as Record<string, unknown>;
  switch (message.type) {
    case "canopy:get-tab":
    case "canopy:get-children":
    case "canopy:get-parent":
    case "canopy:collapse-tree":
    case "canopy:expand-tree":
    case "canopy:detach-tab":
      if (typeof msg.tabId !== "number") return `${message.type} requires numeric tabId`;
      break;
    case "canopy:attach-tab":
      if (typeof msg.tabId !== "number") return "attach-tab requires numeric tabId";
      if (typeof msg.parentId !== "number") return "attach-tab requires numeric parentId";
      break;
    case "canopy:move-tab":
      if (typeof msg.tabId !== "number") return "move-tab requires numeric tabId";
      if (msg.direction !== "up" && msg.direction !== "down") return "move-tab requires direction: 'up' | 'down'";
      break;
    case "canopy:dump-context":
      if (msg.options !== undefined && typeof msg.options !== "object") return "dump-context options must be an object";
      break;
  }
  return null;
}

async function handleAPIMessage(
  message: CanopyAPIMessage,
  tracker: TabParentTracker,
): Promise<unknown> {
  switch (message.type) {
    case "canopy:ping":
      return { ok: true, version: CANOPY_VERSION };

    case "canopy:get-version":
      return { version: CANOPY_VERSION };

    case "canopy:get-tree": {
      const tree = await buildCurrentTree(tracker);
      return { tree: serializeTreeForAPI(tree) };
    }

    case "canopy:get-tab": {
      const tree = await buildCurrentTree(tracker);
      const node = findNodeById(tree, String(message.tabId));
      if (!node) return { error: "Tab not found", code: "NOT_FOUND" };
      return { tab: node.tab, children: node.children.length };
    }

    case "canopy:get-children": {
      const parentMap = tracker.getParentMap();
      const children = getChildren(parentMap, message.tabId);
      return { children };
    }

    case "canopy:get-parent": {
      const parentMap = tracker.getParentMap();
      const parentId = parentMap[message.tabId] ?? null;
      return { parentId };
    }

    case "canopy:collapse-tree":
      // Bug 7 fix: collapse/expand are UI-only operations — not implementable from the API
      // since collapsed state lives in the UI's Zustand store, not the service worker.
      return { error: "collapse-tree is not supported via the external API", code: "NOT_SUPPORTED" };

    case "canopy:expand-tree":
      return { error: "expand-tree is not supported via the external API", code: "NOT_SUPPORTED" };

    case "canopy:attach-tab":
      await tracker.setParent(message.tabId, message.parentId);
      // Bug 8 fix: broadcast so the side panel UI updates
      broadcast({ type: "PARENT_MAP_CHANGED", parentMap: tracker.getParentMap() });
      return { ok: true };

    case "canopy:detach-tab":
      await tracker.removeParent(message.tabId);
      broadcast({ type: "PARENT_MAP_CHANGED", parentMap: tracker.getParentMap() });
      return { ok: true };

    case "canopy:move-tab": {
      // Move tab up or down in Chrome's tab strip
      const tab = await chrome.tabs.get(message.tabId);
      const newIndex = message.direction === "up" ? tab.index - 1 : tab.index + 1;
      if (newIndex >= 0) {
        await chrome.tabs.move(message.tabId, { index: newIndex });
      }
      return { ok: true };
    }

    case "canopy:dump-context": {
      const tree = await buildCurrentTree(tracker);
      const markdown = dumpContextAsMarkdown(tree, message.options);
      return { context: markdown };
    }
  }
}

async function buildCurrentTree(tracker: TabParentTracker) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const parentMap = tracker.getParentMap();
  const groups = chrome.tabGroups ? await chrome.tabGroups.query({}) : [];

  return buildTree(
    tabs.map((t) => ({
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
}

function serializeTreeForAPI(node: { tab?: unknown; group?: unknown; children: unknown[]; id: string; isGroup: boolean }): unknown {
  return {
    id: node.id,
    tab: node.tab ?? null,
    group: node.group ?? null,
    isGroup: node.isGroup,
    children: node.children.map((c) => serializeTreeForAPI(c as typeof node)),
  };
}
