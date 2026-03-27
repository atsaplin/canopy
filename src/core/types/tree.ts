import type { Tab, TabGroup } from "./tab";

/** A node in the tab tree. Can represent a tab, a group container, or the root. */
export interface TabTreeNode {
  /** Tab data (undefined for root node and group containers). */
  tab?: Tab;
  /** Group data (only for group container nodes). */
  group?: TabGroup;
  /** Child nodes. */
  children: TabTreeNode[];
  /** Whether this node is a group container. */
  isGroup: boolean;
  /** Unique ID: tab.id for tabs, `group-${group.id}` for groups, "root" for root. */
  id: string;
}

/** A flattened tree item for virtualized rendering. */
export interface FlatTreeItem {
  /** The tree node. */
  node: TabTreeNode;
  /** Depth level (0 = root children, 1 = grandchildren, etc.). */
  depth: number;
  /** Whether this node's children are visible (not collapsed). */
  isExpanded: boolean;
  /** Number of descendants (all levels). */
  descendantCount: number;
}
