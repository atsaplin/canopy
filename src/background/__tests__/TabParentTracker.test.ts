import { describe, it, expect, beforeEach } from "vitest";
import { TabParentTracker } from "@background/services/TabParentTracker";
import { StorageManager } from "@background/storage/StorageManager";
import type { StorageBackend } from "@background/storage/types";

class MockStorageBackend implements StorageBackend {
  private store = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | undefined> {
    return this.store.get(key) as T | undefined;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe("TabParentTracker", () => {
  let tracker: TabParentTracker;
  let storage: StorageManager;

  beforeEach(async () => {
    storage = new StorageManager(new MockStorageBackend());
    tracker = new TabParentTracker(storage);
    await tracker.init();
  });

  it("starts with empty parent map", () => {
    expect(tracker.getParentMap()).toEqual({});
  });

  it("assigns parent on tab creation with openerTabId", async () => {
    await tracker.onTabCreated({ id: 2, openerTabId: 1 } as chrome.tabs.Tab);
    expect(tracker.getParentMap()[2]).toBe(1);
  });

  it("does not assign parent when no openerTabId", async () => {
    await tracker.onTabCreated({ id: 2 } as chrome.tabs.Tab);
    expect(tracker.getParentMap()[2]).toBeUndefined();
  });

  it("cleans up on tab removal", async () => {
    await tracker.onTabCreated({ id: 2, openerTabId: 1 } as chrome.tabs.Tab);
    await tracker.onTabRemoved(2);
    expect(tracker.getParentMap()[2]).toBeUndefined();
  });

  it("promotes children to grandparent when parent is removed", async () => {
    await tracker.setParent(2, 1);
    await tracker.setParent(3, 2);
    await tracker.onTabRemoved(2);
    // Tab 3 should now be parented to tab 1 (grandparent)
    expect(tracker.getParentMap()[3]).toBe(1);
  });

  it("detaches children to root when root-level parent is removed", async () => {
    await tracker.setParent(2, 1);
    await tracker.onTabRemoved(1);
    expect(tracker.getParentMap()[2]).toBeUndefined();
  });

  it("onTreeRemoved removes tab and all descendants from parent map", async () => {
    await tracker.setParent(2, 1);
    await tracker.setParent(3, 2);
    await tracker.setParent(4, 1);
    await tracker.onTreeRemoved(1);
    // All descendants of tab 1 should be gone
    expect(tracker.getParentMap()).toEqual({});
  });

  it("getAllDescendants returns all nested children", async () => {
    await tracker.setParent(2, 1);
    await tracker.setParent(3, 2);
    await tracker.setParent(4, 1);
    const descendants = tracker.getAllDescendants(1);
    expect(descendants.sort()).toEqual([2, 3, 4]);
  });

  it("persists state to storage", async () => {
    await tracker.setParent(2, 1);
    const map = await storage.getParentMap();
    expect(map[2]).toBe(1);
  });

  it("restores state from storage on init", async () => {
    await storage.setParentMap({ 5: 3 });
    const newTracker = new TabParentTracker(storage);
    await newTracker.init();
    expect(newTracker.getParentMap()[5]).toBe(3);
  });

  it("removes parent for a tab", async () => {
    await tracker.setParent(2, 1);
    await tracker.removeParent(2);
    expect(tracker.getParentMap()[2]).toBeUndefined();
  });
});
