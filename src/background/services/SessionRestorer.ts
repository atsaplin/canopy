import type { SessionData, SessionNode } from "@core/types";
import type { TabParentTracker } from "./TabParentTracker";

const VALID_GROUP_COLORS = new Set([
  "grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange",
]);

const BLOCKED_SCHEMES = new Set(["javascript:", "vbscript:"]);

/** URLs that Chrome won't let extensions open. */
const RESTRICTED_PATTERNS = ["chrome://", "chrome-extension://", "devtools://"];

function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (BLOCKED_SCHEMES.has(parsed.protocol)) return false;
    // Chrome blocks extensions from opening internal URLs
    if (RESTRICTED_PATTERNS.some((p) => url.startsWith(p))) return false;
    return true;
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

  async restore(session: SessionData, mode: "replace" | "add"): Promise<{ created: number; failed: number }> {
    // Set restoring flag so onTabCreated doesn't double-assign parents (Bug 12 fix)
    this.tracker.isRestoring = true;

    try {
      if (mode === "replace") {
        // Count restorable tabs first — don't destroy existing tabs if nothing can be restored (Bug 6 fix)
        const restorableCount = this.countRestorable(session.nodes);
        if (restorableCount === 0) {
          return { created: 0, failed: session.nodes.length };
        }

        try {
          const existingTabs = await chrome.tabs.query({ currentWindow: true });
          await chrome.tabs.create({ url: "about:blank", active: false });
          const idsToClose = existingTabs.map((t) => t.id!).filter(Boolean);
          if (idsToClose.length > 0) {
            await chrome.tabs.remove(idsToClose);
          }
        } catch {
          // Some tabs may already be closed
        }
      }

      const groupAssignments = new Map<string, { name: string; color: string; tabIds: number[] }>();
      const stats = { created: 0, failed: 0 };

      await this.openNodes(session.nodes, undefined, groupAssignments, stats);

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

      return stats;
    } finally {
      this.tracker.isRestoring = false;
    }
  }

  /** Count how many nodes have restorable (safe) URLs. */
  private countRestorable(nodes: SessionNode[]): number {
    let count = 0;
    for (const node of nodes) {
      if (isUrlSafe(node.url)) count++;
      count += this.countRestorable(node.nodes);
    }
    return count;
  }

  private async openNodes(
    nodes: SessionNode[],
    parentTabId: number | undefined,
    groupAssignments: Map<string, { name: string; color: string; tabIds: number[] }>,
    stats: { created: number; failed: number },
  ): Promise<void> {
    for (const node of nodes) {
      if (!isUrlSafe(node.url)) {
        stats.failed++;
        continue;
      }

      let tab: chrome.tabs.Tab;
      try {
        tab = await chrome.tabs.create({ url: node.url, active: false });
      } catch {
        stats.failed++;
        continue;
      }

      if (!tab.id) {
        stats.failed++;
        continue;
      }

      stats.created++;

      if (parentTabId !== undefined) {
        await this.tracker.setParent(tab.id, parentTabId);
      }

      if (node.group) {
        const key = `${node.group.name}:${node.group.color}`;
        if (!groupAssignments.has(key)) {
          groupAssignments.set(key, { name: node.group.name, color: node.group.color, tabIds: [] });
        }
        groupAssignments.get(key)!.tabIds.push(tab.id);
      }

      if (node.nodes.length > 0) {
        await this.openNodes(node.nodes, tab.id, groupAssignments, stats);
      }
    }
  }
}
