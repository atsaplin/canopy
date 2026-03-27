import { setParent, removeParent, getChildren } from "@core/ParentMap";
import type { ParentMap } from "@core/types";
import type { StorageManager } from "@background/storage/StorageManager";

/**
 * Tracks parent-child relationships for tabs.
 * Uses core ParentMap operations, persists via StorageManager.
 */
export class TabParentTracker {
  private parentMap: ParentMap = {};
  constructor(private storage: StorageManager) {}

  /** Initialize from persisted storage. */
  async init(): Promise<void> {
    this.parentMap = await this.storage.getParentMap();
  }

  /** Get current parent map. */
  getParentMap(): ParentMap {
    return { ...this.parentMap };
  }

  /** Handle tab creation — assign parent via openerTabId. */
  async onTabCreated(tab: chrome.tabs.Tab): Promise<void> {
    if (tab.openerTabId !== undefined && tab.id !== undefined) {
      this.parentMap = setParent(this.parentMap, tab.id, tab.openerTabId);
      await this.persist();
    }
  }

  /**
   * Handle tab removal — promote children to parent's parent (or root).
   * This is the default behavior: closing a tab does NOT close children.
   */
  async onTabRemoved(tabId: number): Promise<void> {
    // Read parent before removing
    const parentOfRemoved = this.parentMap[tabId];

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
}
