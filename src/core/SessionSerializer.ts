import type { TabTreeNode, SessionData, SessionNode } from "@core/types";
import { isSessionData } from "@core/types";

/**
 * Serialize a TabTreeNode tree into a SessionData object.
 * Pure function — no Chrome/React dependencies.
 */
export function serializeTree(tree: TabTreeNode, name: string): SessionData {
  return {
    name,
    savedAt: new Date().toISOString(),
    version: 1,
    nodes: serializeNodes(tree.children),
  };
}

/**
 * Serialize a list of TabTreeNode children into SessionNode array.
 * Used for both full tree serialization and partial (copy selection).
 */
export function serializeNodes(nodes: TabTreeNode[]): SessionNode[] {
  const result: SessionNode[] = [];

  for (const node of nodes) {
    if (node.isGroup) {
      // Group container: serialize children with group info attached
      for (const child of node.children) {
        if (child.tab) {
          result.push({
            url: child.tab.url,
            title: child.tab.title,
            group: node.group
              ? { name: node.group.title ?? "", color: node.group.color }
              : undefined,
            nodes: serializeNodes(child.children),
          });
        }
      }
    } else if (node.tab) {
      result.push({
        url: node.tab.url,
        title: node.tab.title,
        nodes: serializeNodes(node.children),
      });
    }
  }

  return result;
}

/**
 * Deserialize a JSON string into a SessionData object.
 * Returns null if the JSON is invalid or doesn't match the schema.
 */
export function deserializeSession(json: string): SessionData | null {
  try {
    const parsed = JSON.parse(json);
    if (isSessionData(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
