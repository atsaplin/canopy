import { describe, it, expect } from "vitest";
import {
  createRootNode,
  createTabNode,
  createGroupNode,
  addChild,
  findNodeById,
  getAllDescendantIds,
  flattenTree,
} from "@core/TabTreeNode";
import type { Tab, TabGroup } from "@core/types";

const tab1: Tab = { id: 1, title: "Tab 1", url: "https://one.com", active: true, index: 0 };
const tab2: Tab = { id: 2, title: "Tab 2", url: "https://two.com", active: false, index: 1 };
const tab3: Tab = { id: 3, title: "Tab 3", url: "https://three.com", active: false, index: 2 };

describe("createRootNode", () => {
  it("creates a root node with no tab and empty children", () => {
    const root = createRootNode();
    expect(root.id).toBe("root");
    expect(root.tab).toBeUndefined();
    expect(root.children).toEqual([]);
    expect(root.isGroup).toBe(false);
  });
});

describe("createTabNode", () => {
  it("creates a tab node with the given tab", () => {
    const node = createTabNode(tab1);
    expect(node.id).toBe("1");
    expect(node.tab).toEqual(tab1);
    expect(node.children).toEqual([]);
    expect(node.isGroup).toBe(false);
  });
});

describe("createGroupNode", () => {
  it("creates a group container node", () => {
    const group: TabGroup = { id: 10, title: "Work", color: "blue", collapsed: false };
    const node = createGroupNode(group);
    expect(node.id).toBe("group-10");
    expect(node.group).toEqual(group);
    expect(node.isGroup).toBe(true);
    expect(node.tab).toBeUndefined();
  });
});

describe("addChild", () => {
  it("returns a new node with the child appended", () => {
    const root = createRootNode();
    const child = createTabNode(tab1);
    const newRoot = addChild(root, child);
    expect(newRoot.children).toHaveLength(1);
    expect(newRoot.children[0].id).toBe("1");
    // Original is unchanged (immutable)
    expect(root.children).toHaveLength(0);
  });
});

describe("findNodeById", () => {
  it("finds a node in a nested tree", () => {
    const root = createRootNode();
    const child1 = addChild(createTabNode(tab1), createTabNode(tab2));
    const newRoot = addChild(root, child1);
    const found = findNodeById(newRoot, "2");
    expect(found).toBeDefined();
    expect(found!.tab).toEqual(tab2);
  });

  it("returns undefined when node not found", () => {
    const root = createRootNode();
    expect(findNodeById(root, "999")).toBeUndefined();
  });
});

describe("getAllDescendantIds", () => {
  it("returns all descendant tab IDs", () => {
    const child1 = addChild(createTabNode(tab1), createTabNode(tab2));
    const root = addChild(addChild(createRootNode(), child1), createTabNode(tab3));
    const ids = getAllDescendantIds(root);
    expect(ids.sort()).toEqual(["1", "2", "3"]);
  });

  it("returns empty array for leaf node", () => {
    const node = createTabNode(tab1);
    expect(getAllDescendantIds(node)).toEqual([]);
  });
});

describe("flattenTree", () => {
  it("flattens a tree into a visible-nodes array with correct depths", () => {
    const child1 = addChild(createTabNode(tab1), createTabNode(tab2));
    const root = addChild(addChild(createRootNode(), child1), createTabNode(tab3));
    const flat = flattenTree(root, new Set());
    expect(flat).toHaveLength(3);
    expect(flat[0].node.id).toBe("1");
    expect(flat[0].depth).toBe(0);
    expect(flat[1].node.id).toBe("2");
    expect(flat[1].depth).toBe(1);
    expect(flat[2].node.id).toBe("3");
    expect(flat[2].depth).toBe(0);
  });

  it("hides children of collapsed nodes", () => {
    const child1 = addChild(createTabNode(tab1), createTabNode(tab2));
    const root = addChild(createRootNode(), child1);
    const flat = flattenTree(root, new Set(["1"]));
    expect(flat).toHaveLength(1);
    expect(flat[0].node.id).toBe("1");
    expect(flat[0].isExpanded).toBe(false);
    expect(flat[0].descendantCount).toBe(1);
  });

  it("returns empty array for root with no children", () => {
    const root = createRootNode();
    expect(flattenTree(root, new Set())).toEqual([]);
  });
});
