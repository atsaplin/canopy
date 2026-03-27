import type { StorageBackend, StorageSchema } from "./types";
import { CURRENT_SCHEMA_VERSION, DEFAULT_STORAGE } from "./types";
import type { SessionData, SessionListItem } from "@core/types";

/** Chrome storage.local implementation of StorageBackend. */
export class ChromeStorageBackend implements StorageBackend {
  async get<T>(key: string): Promise<T | undefined> {
    const result = await chrome.storage.local.get(key);
    return result[key] as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }
}

/**
 * Simple async mutex — serializes writes to prevent read-modify-write races.
 * Each key gets its own lock so independent keys don't block each other.
 */
class AsyncMutex {
  private locks = new Map<string, Promise<void>>();

  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve();
    let release: () => void;
    const next = new Promise<void>((resolve) => { release = resolve; });
    this.locks.set(key, next);
    await prev;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

/** Typed storage manager with schema versioning, migration support, and write serialization. */
export class StorageManager {
  private mutex = new AsyncMutex();

  constructor(private backend: StorageBackend) {}

  async getParentMap(): Promise<Record<number, number>> {
    const data = await this.backend.get<StorageSchema>("canopy");
    return data?.tabParentMap ?? DEFAULT_STORAGE.tabParentMap;
  }

  async setParentMap(parentMap: Record<number, number>): Promise<void> {
    await this.mutex.withLock("canopy", async () => {
      const data = await this.getOrCreateSchema();
      data.tabParentMap = parentMap;
      await this.backend.set("canopy", data);
    });
  }

  async getCollapsedNodeIds(): Promise<string[]> {
    const data = await this.backend.get<StorageSchema>("canopy");
    return data?.collapsedNodeIds ?? DEFAULT_STORAGE.collapsedNodeIds;
  }

  async setCollapsedNodeIds(ids: string[]): Promise<void> {
    await this.mutex.withLock("canopy", async () => {
      const data = await this.getOrCreateSchema();
      data.collapsedNodeIds = ids;
      await this.backend.set("canopy", data);
    });
  }

  async getSchemaVersion(): Promise<number> {
    const data = await this.backend.get<StorageSchema>("canopy");
    return data?.version ?? 0;
  }

  async runMigrations(): Promise<void> {
    await this.mutex.withLock("canopy", async () => {
      const version = await this.getSchemaVersion();
      if (version < CURRENT_SCHEMA_VERSION) {
        const data = await this.getOrCreateSchema();
        data.version = CURRENT_SCHEMA_VERSION;
        await this.backend.set("canopy", data);
      }
    });
  }

  // --- Session methods ---

  async saveSession(session: SessionData): Promise<string> {
    return await this.mutex.withLock("canopy", async () => {
      const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const data = await this.getOrCreateSchema();
      if (!data.sessions) data.sessions = {};
      data.sessions[id] = session;
      await this.backend.set("canopy", data);
      return id;
    });
  }

  async listSessions(): Promise<SessionListItem[]> {
    const data = await this.backend.get<StorageSchema>("canopy");
    const sessions = data?.sessions ?? {};
    return Object.entries(sessions).map(([id, session]) => ({
      id,
      name: session.name,
      savedAt: session.savedAt,
      nodeCount: countNodes(session.nodes),
    }));
  }

  async getSession(id: string): Promise<SessionData | null> {
    const data = await this.backend.get<StorageSchema>("canopy");
    return data?.sessions?.[id] ?? null;
  }

  async deleteSession(id: string): Promise<void> {
    await this.mutex.withLock("canopy", async () => {
      const data = await this.getOrCreateSchema();
      if (data.sessions) {
        delete data.sessions[id];
        await this.backend.set("canopy", data);
      }
    });
  }

  // --- Tab activity methods (separate storage key) ---

  async recordTabAccess(tabId: number): Promise<void> {
    await this.mutex.withLock("canopy_activity", async () => {
      const activity = await this.backend.get<Record<number, number>>("canopy_activity") ?? {};
      activity[tabId] = Date.now();
      await this.backend.set("canopy_activity", activity);
    });
  }

  async getTabActivity(): Promise<Record<number, number>> {
    return await this.backend.get<Record<number, number>>("canopy_activity") ?? {};
  }

  async removeTabActivity(tabId: number): Promise<void> {
    await this.mutex.withLock("canopy_activity", async () => {
      const activity = await this.backend.get<Record<number, number>>("canopy_activity") ?? {};
      delete activity[tabId];
      await this.backend.set("canopy_activity", activity);
    });
  }

  private async getOrCreateSchema(): Promise<StorageSchema> {
    const data = await this.backend.get<StorageSchema>("canopy");
    if (data) return JSON.parse(JSON.stringify(data)) as StorageSchema;
    return JSON.parse(JSON.stringify(DEFAULT_STORAGE)) as StorageSchema;
  }
}

/** Count total nodes recursively in a session. */
function countNodes(nodes: SessionData["nodes"]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1 + countNodes(node.nodes);
  }
  return count;
}
