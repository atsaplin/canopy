import { setParent, removeParent, getChildren } from "@core/ParentMap";
import type { ParentMap } from "@core/types";
import type { StorageManager } from "@background/storage/StorageManager";

/** Recently closed tab info for undo-close restoration. */
interface ClosedTabInfo {
  parentId: number | undefined;
  closedAt: number;
}

/** TTL for recently closed tab cache (30 seconds). */
const CLOSED_TAB_TTL = 30_000;

/**
 * Tracks parent-child relationships for tabs.
 * Uses core ParentMap operations, persists via StorageManager.
 */
export class TabParentTracker {
  private parentMap: ParentMap = {};
  /** Set to true during session restore to skip onTabCreated auto-parenting. */
  isRestoring = false;
  /** Cache of tab URLs for undo-close parent restoration. */
  private tabUrls = new Map<number, string>();
  /** Recently closed tabs: url → parent info. */
  private recentlyClosed = new Map<string, ClosedTabInfo>();

  constructor(private storage: StorageManager) {}

  /** Initialize from persisted storage. */
  async init(): Promise<void> {
    this.parentMap = await this.storage.getParentMap();
    // Populate URL cache from currently open tabs
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id && tab.url) {
          this.tabUrls.set(tab.id, tab.url);
        }
      }
    } catch {
      // May fail in test environments
    }
  }

  /** Get current parent map. */
  getParentMap(): ParentMap {
    return { ...this.parentMap };
  }

  /** Track a tab's URL for undo-close restoration. */
  trackTabUrl(tabId: number, url: string): void {
    this.tabUrls.set(tabId, url);
  }

  /** Handle tab creation — assign parent via openerTabId or undo-close match. */
  async onTabCreated(tab: chrome.tabs.Tab): Promise<void> {
    if (tab.id === undefined) return;

    // Track URL
    const url = tab.pendingUrl || tab.url;
    if (url) this.tabUrls.set(tab.id, url);

    // Check if this is an undo-close (Cmd+Shift+T) — match by URL
    if (url) {
      const closed = this.recentlyClosed.get(url);
      if (closed && Date.now() - closed.closedAt < CLOSED_TAB_TTL) {
        this.recentlyClosed.delete(url);
        if (closed.parentId !== undefined) {
          // Verify the parent tab still exists
          const parentExists = this.tabUrls.has(closed.parentId) ||
            Object.values(this.parentMap).includes(closed.parentId) ||
            closed.parentId in this.parentMap;
          if (parentExists) {
            this.parentMap = setParent(this.parentMap, tab.id, closed.parentId);
            await this.persist();
            return;
          }
        }
        // Tab was a root-level tab — don't assign any parent
        return;
      }
    }

    // Normal tab creation — assign parent via openerTabId
    if (tab.openerTabId !== undefined) {
      this.parentMap = setParent(this.parentMap, tab.id, tab.openerTabId);
      await this.persist();
    }
  }

  /**
   * Handle tab removal — promote children to parent's parent (or root).
   * Caches the tab's URL and parent for undo-close restoration.
   */
  async onTabRemoved(tabId: number): Promise<void> {
    // Cache for undo-close before removing
    const url = this.tabUrls.get(tabId);
    const parentOfRemoved = this.parentMap[tabId];
    if (url) {
      this.recentlyClosed.set(url, {
        parentId: parentOfRemoved,
        closedAt: Date.now(),
      });
      // Clean up old entries
      this.cleanupClosedCache();
    }
    this.tabUrls.delete(tabId);

    // Remove this tab as a child
    this.parentMap = removeParent(this.parentMap, tabId);

    // Promote orphaned children to this tab's parent (or root)
    const newMap = { ...this.parentMap };
    for (const [childStr, pid] of Object.entries(newMap)) {
      if (pid === tabId) {
        if (parentOfRemoved !== undefined) {
          newMap[Number(childStr)] = parentOfRemoved;
        } else {
          delete newMap[Number(childStr)];
        }
      }
    }
    this.parentMap = newMap;
    await this.persist();
  }

  /** Get all descendant tab IDs recursively. */
  getAllDescendants(tabId: number): number[] {
    const descendants: number[] = [];
    const children = getChildren(this.parentMap, tabId);
    for (const childId of children) {
      descendants.push(childId);
      descendants.push(...this.getAllDescendants(childId));
    }
    return descendants;
  }

  /**
   * Remove a tab and all its descendants from the parent map.
   * Used by CLOSE_TAB_TREE — the actual tab closing is handled by the message handler.
   */
  async onTreeRemoved(tabId: number): Promise<void> {
    const descendants = this.getAllDescendants(tabId);
    const allRemoved = new Set([tabId, ...descendants]);

    const newMap = { ...this.parentMap };
    for (const id of allRemoved) {
      delete newMap[id];
    }
    // Clean up any entries pointing to removed tabs
    for (const [childStr, pid] of Object.entries(newMap)) {
      if (allRemoved.has(pid)) {
        delete newMap[Number(childStr)];
      }
    }
    this.parentMap = newMap;
    await this.persist();
  }

  /** Manually set parent for a tab (used by reparent operation). */
  async setParent(tabId: number, parentId: number): Promise<void> {
    this.parentMap = setParent(this.parentMap, tabId, parentId);
    await this.persist();
  }

  /** Remove parent for a tab (detach to root). */
  async removeParent(tabId: number): Promise<void> {
    this.parentMap = removeParent(this.parentMap, tabId);
    await this.persist();
  }

  private async persist(): Promise<void> {
    await this.storage.setParentMap(this.parentMap);
  }

  /** Remove expired entries from the recently closed cache. */
  private cleanupClosedCache(): void {
    const now = Date.now();
    for (const [url, info] of this.recentlyClosed) {
      if (now - info.closedAt > CLOSED_TAB_TTL) {
        this.recentlyClosed.delete(url);
      }
    }
  }
}
