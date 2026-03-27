import { describe, it, expect } from "vitest";
import { buildTree } from "@core/TreeBuilder";
import { flattenTree } from "@core/TabTreeNode";
import type { Tab, ParentMap } from "@core/types";

function makeTabs(count: number): Tab[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Tab ${i + 1} - Some website title that is reasonably long`,
    url: `https://example-${i + 1}.com/path/to/page?query=value`,
    active: i === 0,
    index: i,
    favIconUrl: `https://example-${i + 1}.com/favicon.ico`,
    status: "complete" as const,
  }));
}

/** Create a parent map with ~30% of tabs having parents (realistic tree). */
function makeParentMap(count: number): ParentMap {
  const map: ParentMap = {};
  for (let i = 2; i <= count; i++) {
    if (i % 3 === 0) {
      // Every 3rd tab is a child of a tab 1-5 positions earlier
      const parentOffset = Math.min(1 + (i % 5), i - 1);
      map[i] = i - parentOffset;
    }
  }
  return map;
}

describe("Performance benchmarks", () => {
  it("buildTree with 500 tabs completes in under 50ms", () => {
    const tabs = makeTabs(500);
    const parentMap = makeParentMap(500);

    const start = performance.now();
    const tree = buildTree(tabs, parentMap, []);
    const duration = performance.now() - start;

    expect(tree.children.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(50);
  });

  it("buildTree with 1000 tabs completes in under 100ms", () => {
    const tabs = makeTabs(1000);
    const parentMap = makeParentMap(1000);

    const start = performance.now();
    const tree = buildTree(tabs, parentMap, []);
    const duration = performance.now() - start;

    expect(tree.children.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100);
  });

  it("flattenTree with 500 nodes completes in under 10ms", () => {
    const tabs = makeTabs(500);
    const parentMap = makeParentMap(500);
    const tree = buildTree(tabs, parentMap, []);

    const start = performance.now();
    const flat = flattenTree(tree, new Set());
    const duration = performance.now() - start;

    expect(flat.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(10);
  });

  it("flattenTree with collapsed nodes skips subtrees efficiently", () => {
    const tabs = makeTabs(500);
    const parentMap = makeParentMap(500);
    const tree = buildTree(tabs, parentMap, []);
    const allFlat = flattenTree(tree, new Set());

    // Collapse the first 10 root-level nodes
    const collapsedIds = new Set(
      allFlat.filter((item) => item.depth === 0).slice(0, 10).map((item) => item.node.id),
    );

    const start = performance.now();
    const flat = flattenTree(tree, collapsedIds);
    const duration = performance.now() - start;

    expect(flat.length).toBeLessThan(allFlat.length);
    expect(duration).toBeLessThan(10);
  });

  it("buildTree + flattenTree full pipeline for 500 tabs under 50ms", () => {
    const tabs = makeTabs(500);
    const parentMap = makeParentMap(500);

    const start = performance.now();
    const tree = buildTree(tabs, parentMap, []);
    const flat = flattenTree(tree, new Set());
    const duration = performance.now() - start;

    expect(flat.length).toBe(500);
    expect(duration).toBeLessThan(50);
  });
});
