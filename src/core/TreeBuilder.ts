import type { Tab, TabGroup, ParentMap, TabTreeNode } from "@core/types";
import { createRootNode, createTabNode, createGroupNode, addChild } from "@core/TabTreeNode";

/**
 * Build a tree from flat tab data, parent map, and tab groups.
 * Pure function — no Chrome API access.
 */
export function buildTree(
  tabs: Tab[],
  parentMap: ParentMap,
  groups: TabGroup[],
): TabTreeNode {
  if (tabs.length === 0) return createRootNode();

  // Create nodes for all tabs
  const nodeMap = new Map<string, TabTreeNode>();
  for (const tab of tabs) {
    nodeMap.set(String(tab.id), createTabNode(tab));
  }

  // Create group container nodes
  const groupMap = new Map<number, TabTreeNode>();
  for (const group of groups) {
    const groupNode = createGroupNode(group);
    groupMap.set(group.id, groupNode);
  }

  // Detect cycles in parent map using ancestor traversal
  const hasCycle = (tabId: number): boolean => {
    const visited = new Set<number>();
    let current = tabId;
    while (current in parentMap) {
      if (visited.has(current)) return true;
      visited.add(current);
      current = parentMap[current];
    }
    return false;
  };

  // Build the tree structure
  let root = createRootNode();

  // Determine which tabs are children (have valid parents)
  const childIds = new Set<string>();
  for (const tab of tabs) {
    const parentId = parentMap[tab.id];
    if (
      parentId !== undefined &&
      nodeMap.has(String(parentId)) &&
      !hasCycle(tab.id)
    ) {
      childIds.add(String(tab.id));
    }
  }

  // Attach children to their parents (bottom-up is tricky with immutable nodes, so build top-down)
  // First pass: collect children per parent
  const childrenOf = new Map<string, TabTreeNode[]>();
  for (const tab of tabs) {
    const parentId = parentMap[tab.id];
    if (childIds.has(String(tab.id)) && parentId !== undefined) {
      const parentKey = String(parentId);
      if (!childrenOf.has(parentKey)) {
        childrenOf.set(parentKey, []);
      }
      childrenOf.get(parentKey)!.push(nodeMap.get(String(tab.id))!);
    }
  }

  // Recursive function to build a node with its children
  function buildNode(node: TabTreeNode): TabTreeNode {
    const children = childrenOf.get(node.id) ?? [];
    let result = node;
    for (const child of children) {
      result = addChild(result, buildNode(child));
    }
    return result;
  }

  // Build group containers with their tabs
  const tabsInGroups = new Set<number>();
  for (const tab of tabs) {
    if (tab.groupId !== undefined && tab.groupId >= 0 && groupMap.has(tab.groupId)) {
      tabsInGroups.add(tab.id);
    }
  }

  // Build group nodes
  const builtGroups = new Map<number, TabTreeNode>();
  for (const [groupId, groupNode] of groupMap) {
    let built = groupNode;
    for (const tab of tabs) {
      if (tab.groupId === groupId && !childIds.has(String(tab.id))) {
        built = addChild(built, buildNode(nodeMap.get(String(tab.id))!));
      }
    }
    builtGroups.set(groupId, built);
  }

  // Assemble root: groups and ungrouped root-level tabs, preserving tab order
  const addedGroups = new Set<number>();

  for (const tab of tabs) {
    if (childIds.has(String(tab.id))) continue; // skip children

    if (tab.groupId !== undefined && tab.groupId >= 0 && builtGroups.has(tab.groupId)) {
      if (!addedGroups.has(tab.groupId)) {
        root = addChild(root, builtGroups.get(tab.groupId)!);
        addedGroups.add(tab.groupId);
      }
    } else {
      root = addChild(root, buildNode(nodeMap.get(String(tab.id))!));
    }
  }

  return root;
}
