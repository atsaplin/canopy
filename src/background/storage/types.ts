/** Storage backend interface — can be swapped to IndexedDB later. */
export interface StorageBackend {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

import type { SessionData } from "@core/types";

/** Schema for stored data, includes version for migrations. */
export interface StorageSchema {
  version: number;
  tabParentMap: Record<number, number>;
  collapsedNodeIds: string[];
  uiState: {
    searchKeyword: string;
    selectedNodeId: string | null;
  };
  sessions: Record<string, SessionData>;
  tabActivity: Record<number, number>; // tabId → lastAccessed timestamp
}

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_STORAGE: StorageSchema = {
  version: CURRENT_SCHEMA_VERSION,
  tabParentMap: {},
  collapsedNodeIds: [],
  uiState: {
    searchKeyword: "",
    selectedNodeId: null,
  },
  sessions: {},
  tabActivity: {},
};
