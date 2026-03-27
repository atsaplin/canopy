import type { SessionData, SessionNode } from "@core/types";
import type { TabParentTracker } from "./TabParentTracker";

const VALID_GROUP_COLORS = new Set([
  "grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange",
]);

const BLOCKED_SCHEMES = new Set(["javascript:", "vbscript:"]);

function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    return !BLOCKED_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Restores a saved session by opening tabs in tree order
 * and recreating tab groups.
 */
export class SessionRestorer {
  constructor(private tracker: TabParentTracker) {}

  async restore(session: SessionData, mode: "replace" | "add"): Promise<void> {
    if (mode === "replace") {
      try {
        const existingTabs = await chrome.tabs.query({ currentWindow: true });
        // Create a blank tab to keep the window alive
        await chrome.tabs.create({ url: "about:blank", active: false });
        const idsToClose = existingTabs.map((t) => t.id!).filter(Boolean);
        if (idsToClose.length > 0) {
          await chrome.tabs.remove(idsToClose);
        }
      } catch {
        // Some tabs may already be closed
      }
    }

    // Collect group assignments across the entire tree, then apply once
    const groupAssignments = new Map<string, { name: string; color: string; tabIds: number[] }>();

    await this.openNodes(session.nodes, undefined, groupAssignments);

    // Create all tab groups in one pass
    for (const [, batch] of groupAssignments) {
      if (batch.tabIds.length > 0) {
        try {
          const groupId = await chrome.tabs.group({
            tabIds: batch.tabIds as [number, ...number[]],
          });
          const color = VALID_GROUP_COLORS.has(batch.color) ? batch.color : "grey";
          await chrome.tabGroups.update(groupId, {
            title: batch.name,
            color: color as chrome.tabGroups.Color,
          });
        } catch {
          // Tab groups may not be available
        }
      }
    }
  }

  private async openNodes(
    nodes: SessionNode[],
    parentTabId: number | undefined,
    groupAssignments: Map<string, { name: string; color: string; tabIds: number[] }>,
  ): Promise<void> {
    for (const node of nodes) {
      if (!isUrlSafe(node.url)) continue;

      let tab: chrome.tabs.Tab;
      try {
        tab = await chrome.tabs.create({ url: node.url, active: false });
      } catch {
        continue; // Skip tabs that fail to create (restricted URLs)
      }

      if (!tab.id) continue;

      if (parentTabId !== undefined) {
        await this.tracker.setParent(tab.id, parentTabId);
      }

      // Track group membership (hoisted map, applied after all tabs created)
      if (node.group) {
        const key = `${node.group.name}:${node.group.color}`;
        if (!groupAssignments.has(key)) {
          groupAssignments.set(key, { name: node.group.name, color: node.group.color, tabIds: [] });
        }
        groupAssignments.get(key)!.tabIds.push(tab.id);
      }

      if (node.nodes.length > 0) {
        await this.openNodes(node.nodes, tab.id, groupAssignments);
      }
    }
  }
}
