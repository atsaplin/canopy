import { describe, it, expect } from "vitest";
import { serializeTree, deserializeSession, serializeNodes } from "@core/SessionSerializer";
import { buildTree } from "@core/TreeBuilder";
import type { Tab, TabGroup } from "@core/types";

const makeTabs = (...titles: string[]): Tab[] =>
  titles.map((title, i) => ({
    id: i + 1,
    title,
    url: `https://${title.toLowerCase().replace(/\s/g, "-")}.com`,
    active: i === 0,
    index: i,
  }));

describe("serializeTree", () => {
  it("serializes a flat tree with 2 tabs", () => {
    const tabs = makeTabs("Tab A", "Tab B");
    const tree = buildTree(tabs, {}, []);
    const session = serializeTree(tree, "My Session");

    expect(session.name).toBe("My Session");
    expect(session.version).toBe(1);
    expect(session.savedAt).toBeTruthy();
    expect(session.nodes).toHaveLength(2);
    expect(session.nodes[0].url).toBe("https://tab-a.com");
    expect(session.nodes[0].title).toBe("Tab A");
    expect(session.nodes[0].nodes).toEqual([]);
  });

  it("serializes a nested tree preserving parent-child structure", () => {
    const tabs = makeTabs("Parent", "Child");
    const tree = buildTree(tabs, { 2: 1 }, []);
    const session = serializeTree(tree, "Nested");

    expect(session.nodes).toHaveLength(1);
    expect(session.nodes[0].title).toBe("Parent");
    expect(session.nodes[0].nodes).toHaveLength(1);
    expect(session.nodes[0].nodes[0].title).toBe("Child");
  });

  it("serializes an empty tree", () => {
    const tree = buildTree([], {}, []);
    const session = serializeTree(tree, "Empty");

    expect(session.nodes).toEqual([]);
  });

  it("includes tab group info on nodes", () => {
    const tabs: Tab[] = [
      { id: 1, title: "Grouped", url: "https://grouped.com", active: true, index: 0, groupId: 10 },
      { id: 2, title: "Ungrouped", url: "https://ungrouped.com", active: false, index: 1 },
    ];
    const groups: TabGroup[] = [{ id: 10, title: "Work", color: "blue", collapsed: false }];
    const tree = buildTree(tabs, {}, groups);
    const session = serializeTree(tree, "Groups");

    // Find the node with group info (inside the group container)
    const allNodes = flattenSessionNodes(session.nodes);
    const grouped = allNodes.find((n) => n.title === "Grouped");
    expect(grouped?.group).toEqual({ name: "Work", color: "blue" });

    const ungrouped = allNodes.find((n) => n.title === "Ungrouped");
    expect(ungrouped?.group).toBeUndefined();
  });
});

describe("deserializeSession", () => {
  it("deserializes valid JSON", () => {
    const json = JSON.stringify({
      name: "Test",
      savedAt: "2026-01-01T00:00:00Z",
      version: 1,
      nodes: [{ url: "https://a.com", title: "A", nodes: [] }],
    });
    const result = deserializeSession(json);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Test");
    expect(result!.nodes).toHaveLength(1);
  });

  it("returns null for invalid JSON string", () => {
    expect(deserializeSession("not json")).toBeNull();
  });

  it("returns null for valid JSON but wrong schema", () => {
    expect(deserializeSession(JSON.stringify({ wrong: "schema" }))).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(deserializeSession("")).toBeNull();
  });

  it("round-trips: serialize → JSON → deserialize", () => {
    const tabs = makeTabs("A", "B", "C");
    const tree = buildTree(tabs, { 2: 1 }, []);
    const original = serializeTree(tree, "Round Trip");

    const json = JSON.stringify(original);
    const restored = deserializeSession(json);

    expect(restored).not.toBeNull();
    expect(restored!.name).toBe("Round Trip");
    expect(restored!.nodes).toHaveLength(2); // A (with child B) and C
    expect(restored!.nodes[0].nodes).toHaveLength(1);
  });
});

describe("serializeNodes", () => {
  it("serializes a list of tree nodes as session nodes", () => {
    const tabs = makeTabs("A", "B");
    const tree = buildTree(tabs, { 2: 1 }, []);
    const nodes = serializeNodes(tree.children);

    expect(nodes).toHaveLength(1); // only root-level node A
    expect(nodes[0].title).toBe("A");
    expect(nodes[0].nodes).toHaveLength(1);
    expect(nodes[0].nodes[0].title).toBe("B");
  });
});

// Helper to flatten session nodes for easier assertions
function flattenSessionNodes(
  nodes: { url: string; title: string; group?: { name: string; color: string }; nodes: unknown[] }[],
): { url: string; title: string; group?: { name: string; color: string } }[] {
  const result: { url: string; title: string; group?: { name: string; color: string } }[] = [];
  for (const node of nodes) {
    result.push(node);
    result.push(...flattenSessionNodes(node.nodes as typeof nodes));
  }
  return result;
}
