/** A node in a saved session — recursive. */
export interface SessionNode {
  url: string;
  title: string;
  group?: { name: string; color: string };
  nodes: SessionNode[];
}

/** A saved session with metadata + nested tab tree. */
export interface SessionData {
  name: string;
  savedAt: string;
  version: number;
  nodes: SessionNode[];
}

/** Lightweight metadata for listing sessions. */
export interface SessionListItem {
  id: string;
  name: string;
  savedAt: string;
  nodeCount: number;
}

/** Type guard for SessionNode (validates recursively). */
export function isSessionNode(value: unknown): value is SessionNode {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.url !== "string") return false;
  if (typeof obj.title !== "string") return false;
  if (!Array.isArray(obj.nodes)) return false;
  // Validate group field if present
  if (obj.group !== undefined) {
    if (typeof obj.group !== "object" || obj.group === null) return false;
    const group = obj.group as Record<string, unknown>;
    if (typeof group.name !== "string" || typeof group.color !== "string") return false;
  }
  // Validate nested nodes recursively
  for (const child of obj.nodes) {
    if (!isSessionNode(child)) return false;
  }
  return true;
}

/** Type guard for SessionData. */
export function isSessionData(value: unknown): value is SessionData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.name !== "string") return false;
  if (typeof obj.savedAt !== "string") return false;
  if (typeof obj.version !== "number") return false;
  if (!Array.isArray(obj.nodes)) return false;
  for (const node of obj.nodes) {
    if (!isSessionNode(node)) return false;
  }
  return true;
}
