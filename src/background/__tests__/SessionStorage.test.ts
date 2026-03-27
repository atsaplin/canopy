import { describe, it, expect, beforeEach } from "vitest";
import { StorageManager } from "@background/storage/StorageManager";
import type { StorageBackend } from "@background/storage/types";
import type { SessionData } from "@core/types";

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

const makeSession = (name: string): SessionData => ({
  name,
  savedAt: new Date().toISOString(),
  version: 1,
  nodes: [{ url: "https://example.com", title: "Example", nodes: [] }],
});

describe("StorageManager sessions", () => {
  let manager: StorageManager;

  beforeEach(() => {
    manager = new StorageManager(new MockStorageBackend());
  });

  it("saves a session and returns an ID", async () => {
    const id = await manager.saveSession(makeSession("Test"));
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("lists saved sessions with metadata", async () => {
    await manager.saveSession(makeSession("First"));
    await manager.saveSession(makeSession("Second"));
    const list = await manager.listSessions();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe("First");
    expect(list[1].name).toBe("Second");
    expect(list[0].nodeCount).toBe(1);
  });

  it("gets a session by ID", async () => {
    const id = await manager.saveSession(makeSession("Get Me"));
    const session = await manager.getSession(id);
    expect(session).not.toBeNull();
    expect(session!.name).toBe("Get Me");
    expect(session!.nodes).toHaveLength(1);
  });

  it("returns null for nonexistent session ID", async () => {
    const session = await manager.getSession("nonexistent");
    expect(session).toBeNull();
  });

  it("deletes a session", async () => {
    const id = await manager.saveSession(makeSession("Delete Me"));
    await manager.deleteSession(id);
    const session = await manager.getSession(id);
    expect(session).toBeNull();
    const list = await manager.listSessions();
    expect(list).toHaveLength(0);
  });

  it("delete is a no-op for nonexistent ID", async () => {
    await manager.deleteSession("nonexistent");
    const list = await manager.listSessions();
    expect(list).toHaveLength(0);
  });
});
