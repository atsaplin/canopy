import type { ParentMap } from "@core/types";

/** Set a parent-child relationship (immutable). */
export function setParent(
  map: ParentMap,
  childId: number,
  parentId: number,
): ParentMap {
  return { ...map, [childId]: parentId };
}

/** Remove a parent-child relationship (immutable). */
export function removeParent(map: ParentMap, childId: number): ParentMap {
  if (!(childId in map)) return map;
  const result = { ...map };
  delete result[childId];
  return result;
}

/** Get all child IDs for a given parent. */
export function getChildren(map: ParentMap, parentId: number): number[] {
  const children: number[] = [];
  for (const [childStr, pid] of Object.entries(map)) {
    if (pid === parentId) {
      children.push(Number(childStr));
    }
  }
  return children;
}

/** Get ancestor chain for a tab (with cycle detection). */
export function getAncestors(map: ParentMap, tabId: number): number[] {
  const ancestors: number[] = [];
  const visited = new Set<number>([tabId]);
  let current = tabId;

  while (current in map) {
    const parent = map[current];
    if (visited.has(parent)) break; // cycle detected
    visited.add(parent);
    ancestors.push(parent);
    current = parent;
  }

  return ancestors;
}

/** Serialize a parent map for storage. */
export function serializeParentMap(map: ParentMap): string {
  return JSON.stringify(map);
}

/** Deserialize a parent map from storage. */
export function deserializeParentMap(serialized: string): ParentMap {
  const parsed = JSON.parse(serialized) as Record<string, number>;
  const result: ParentMap = {};
  for (const [key, value] of Object.entries(parsed)) {
    result[Number(key)] = value;
  }
  return result;
}
