import { describe, it, expect } from "vitest";
import { buildTree } from "@core/TreeBuilder";
import type { Tab, TabGroup, ParentMap } from "@core/types";

const makeTabs = (count: number): Tab[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Tab ${i + 1}`,
    url: `https://tab${i + 1}.com`,
    active: i === 0,
    index: i,
  }));

describe("buildTree", () => {
  it("returns root with tabs as direct children when no parent map", () => {
    const tabs = makeTabs(3);
    const tree = buildTree(tabs, {}, []);
    expect(tree.id).toBe("root");
    expect(tree.children).toHaveLength(3);
    expect(tree.children[0].tab?.id).toBe(1);
    expect(tree.children[2].tab?.id).toBe(3);
  });

  it("returns empty root for empty input", () => {
    const tree = buildTree([], {}, []);
    expect(tree.children).toHaveLength(0);
  });

  it("nests children according to parent map", () => {
    const tabs = makeTabs(3);
    const parentMap: ParentMap = { 2: 1, 3: 1 };
    const tree = buildTree(tabs, parentMap, []);
    expect(tree.children).toHaveLength(1); // only tab 1 at root
    expect(tree.children[0].children).toHaveLength(2); // tabs 2 and 3 under tab 1
  });

  it("handles deep nesting", () => {
    const tabs = makeTabs(4);
    const parentMap: ParentMap = { 2: 1, 3: 2, 4: 3 };
    const tree = buildTree(tabs, parentMap, []);
    expect(tree.children).toHaveLength(1); // only tab 1 at root
    expect(tree.children[0].tab?.id).toBe(1);
    expect(tree.children[0].children[0].tab?.id).toBe(2);
    expect(tree.children[0].children[0].children[0].tab?.id).toBe(3);
    expect(tree.children[0].children[0].children[0].children[0].tab?.id).toBe(4);
  });

  it("handles cyclic parent map without stack overflow", () => {
    const tabs = makeTabs(2);
    const parentMap: ParentMap = { 1: 2, 2: 1 };
    // Should not throw, should place both at root
    const tree = buildTree(tabs, parentMap, []);
    expect(tree.children.length).toBeGreaterThanOrEqual(1);
  });

  it("handles orphaned parent references by placing at root", () => {
    const tabs = makeTabs(2);
    const parentMap: ParentMap = { 2: 999 }; // parent 999 doesn't exist
    const tree = buildTree(tabs, parentMap, []);
    expect(tree.children).toHaveLength(2); // both at root
  });

  it("creates group container nodes for tab groups", () => {
    const tabs: Tab[] = [
      { id: 1, title: "T1", url: "https://1.com", active: true, index: 0, groupId: 10 },
      { id: 2, title: "T2", url: "https://2.com", active: false, index: 1, groupId: 10 },
      { id: 3, title: "T3", url: "https://3.com", active: false, index: 2 },
    ];
    const groups: TabGroup[] = [{ id: 10, title: "Work", color: "blue", collapsed: false }];
    const tree = buildTree(tabs, {}, groups);
    // Should have group container + tab 3 at root
    expect(tree.children).toHaveLength(2);
    const groupNode = tree.children.find((c) => c.isGroup);
    expect(groupNode).toBeDefined();
    expect(groupNode!.group?.title).toBe("Work");
    expect(groupNode!.children).toHaveLength(2);
  });
});
