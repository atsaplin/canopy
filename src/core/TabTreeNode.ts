import type { Tab, TabGroup, TabTreeNode, FlatTreeItem } from "@core/types";

export function createRootNode(): TabTreeNode {
  return { id: "root", children: [], isGroup: false };
}

export function createTabNode(tab: Tab): TabTreeNode {
  return { id: String(tab.id), tab, children: [], isGroup: false };
}

export function createGroupNode(group: TabGroup): TabTreeNode {
  return { id: `group-${group.id}`, group, children: [], isGroup: true };
}

/** Returns a new node with the child appended (immutable). */
export function addChild(parent: TabTreeNode, child: TabTreeNode): TabTreeNode {
  return { ...parent, children: [...parent.children, child] };
}

/** Recursively finds a node by its ID. */
export function findNodeById(
  node: TabTreeNode,
  id: string,
): TabTreeNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return undefined;
}

/** Returns all descendant IDs (not including the node itself). */
export function getAllDescendantIds(node: TabTreeNode): string[] {
  const ids: string[] = [];
  for (const child of node.children) {
    ids.push(child.id);
    ids.push(...getAllDescendantIds(child));
  }
  return ids;
}

/** Returns all descendant tab IDs (numbers only, skips group nodes). */
export function getAllDescendantTabIds(node: TabTreeNode): number[] {
  const ids: number[] = [];
  for (const child of node.children) {
    if (child.tab) {
      ids.push(child.tab.id);
    }
    ids.push(...getAllDescendantTabIds(child));
  }
  return ids;
}

/** Count all descendants recursively. */
function countDescendants(node: TabTreeNode): number {
  let count = 0;
  for (const child of node.children) {
    count += 1 + countDescendants(child);
  }
  return count;
}

/**
 * Flatten the tree into a visible-nodes array for virtualized rendering.
 * Nodes whose parent is in `collapsedIds` are hidden.
 */
export function flattenTree(
  root: TabTreeNode,
  collapsedIds: Set<string>,
): FlatTreeItem[] {
  const items: FlatTreeItem[] = [];

  function walk(node: TabTreeNode, depth: number): void {
    for (const child of node.children) {
      const isExpanded = !collapsedIds.has(child.id);
      items.push({
        node: child,
        depth,
        isExpanded,
        descendantCount: countDescendants(child),
      });
      if (isExpanded) {
        walk(child, depth + 1);
      }
    }
  }

  walk(root, 0);
  return items;
}
