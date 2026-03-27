import { describe, it, expect, beforeEach } from "vitest";
import { StorageManager } from "@background/storage/StorageManager";
import type { StorageBackend } from "@background/storage/types";

/** In-memory storage backend for testing. */
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

describe("StorageManager", () => {
  let backend: MockStorageBackend;
  let manager: StorageManager;

  beforeEach(() => {
    backend = new MockStorageBackend();
    manager = new StorageManager(backend);
  });

  it("returns empty parent map when no data stored", async () => {
    const map = await manager.getParentMap();
    expect(map).toEqual({});
  });

  it("persists and retrieves parent map", async () => {
    await manager.setParentMap({ 2: 1, 3: 1 });
    const map = await manager.getParentMap();
    expect(map).toEqual({ 2: 1, 3: 1 });
  });

  it("returns empty collapsed node IDs when no data stored", async () => {
    const ids = await manager.getCollapsedNodeIds();
    expect(ids).toEqual([]);
  });

  it("persists and retrieves collapsed node IDs", async () => {
    await manager.setCollapsedNodeIds(["1", "3"]);
    const ids = await manager.getCollapsedNodeIds();
    expect(ids).toEqual(["1", "3"]);
  });

  it("returns version 0 when no schema exists", async () => {
    const version = await manager.getSchemaVersion();
    expect(version).toBe(0);
  });

  it("runs migrations and sets current version", async () => {
    await manager.runMigrations();
    const version = await manager.getSchemaVersion();
    expect(version).toBe(1);
  });

  it("preserves existing data during migration", async () => {
    await manager.setParentMap({ 5: 3 });
    await manager.runMigrations();
    const map = await manager.getParentMap();
    expect(map).toEqual({ 5: 3 });
  });
});
