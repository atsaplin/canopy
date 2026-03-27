import type { ParentMap, TabTreeNode } from "@core/types";
import { findNodeById, getAllDescendantTabIds } from "@core/TabTreeNode";
import { getChildren } from "@core/ParentMap";

/**
 * Get all descendant tab IDs for cascade close.
 * Checks both the tree structure and the parent map for completeness —
 * the tree may not reflect recent parent map changes due to sync timing.
 */
export function getDescendantsFromParentMap(
  tabId: number,
  tree: TabTreeNode,
  parentMap: ParentMap,
): number[] {
  const descendants = new Set<number>();

  // Source 1: tree structure (what the UI shows)
  const treeNode = findNodeById(tree, String(tabId));
  if (treeNode) {
    for (const id of getAllDescendantTabIds(treeNode)) {
      descendants.add(id);
    }
  }

  // Source 2: parent map (authoritative, may have entries not yet in tree)
  function walkParentMap(parentId: number) {
    const children = getChildren(parentMap, parentId);
    for (const childId of children) {
      descendants.add(childId);
      walkParentMap(childId);
    }
  }
  walkParentMap(tabId);

  return Array.from(descendants);
}
