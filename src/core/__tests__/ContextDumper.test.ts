import { describe, it, expect } from "vitest";
import { dumpContextAsMarkdown, dumpNodesAsMarkdown } from "@core/ContextDumper";
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

describe("dumpContextAsMarkdown", () => {
  it("renders a flat tree with titles and URLs", () => {
    const tabs = makeTabs("React Docs", "GitHub Issues");
    const tree = buildTree(tabs, {}, []);
    const result = dumpContextAsMarkdown(tree);

    expect(result).toContain("# Browsing Context");
    expect(result).toContain("2 tabs open");
    expect(result).toContain("• React Docs");
    expect(result).toContain("https://react-docs.com");
    expect(result).toContain("• GitHub Issues");
    expect(result).toContain("https://github-issues.com");
  });

  it("renders nested tree with indentation", () => {
    const tabs = makeTabs("Parent", "Child", "Grandchild");
    const tree = buildTree(tabs, { 2: 1, 3: 2 }, []);
    const result = dumpContextAsMarkdown(tree);

    expect(result).toContain("▸ Parent");
    expect(result).toContain("  ▸ Child");
    expect(result).toContain("    • Grandchild");
  });

  it("uses ▸ for nodes with children and • for leaves", () => {
    const tabs = makeTabs("Parent", "Child");
    const tree = buildTree(tabs, { 2: 1 }, []);
    const result = dumpContextAsMarkdown(tree);

    expect(result).toContain("▸ Parent");
    expect(result).toContain("  • Child");
  });

  it("renders tab groups with color and name", () => {
    const tabs: Tab[] = [
      { id: 1, title: "Work Tab", url: "https://work.com", active: true, index: 0, groupId: 10 },
      { id: 2, title: "Personal Tab", url: "https://personal.com", active: false, index: 1 },
    ];
    const groups: TabGroup[] = [{ id: 10, title: "Work", color: "blue", collapsed: false }];
    const tree = buildTree(tabs, {}, groups);
    const result = dumpContextAsMarkdown(tree);

    expect(result).toContain("[blue] Work");
    expect(result).toContain("Work Tab");
  });

  it("handles empty tree", () => {
    const tree = buildTree([], {}, []);
    const result = dumpContextAsMarkdown(tree);

    expect(result).toContain("No tabs open.");
  });

  it("respects includeUrls: false", () => {
    const tabs = makeTabs("Test Tab");
    const tree = buildTree(tabs, {}, []);
    const result = dumpContextAsMarkdown(tree, { includeUrls: false });

    expect(result).toContain("• Test Tab");
    expect(result).not.toContain("https://");
  });

  it("respects custom title", () => {
    const tabs = makeTabs("Tab");
    const tree = buildTree(tabs, {}, []);
    const result = dumpContextAsMarkdown(tree, { title: "My Research" });

    expect(result).toContain("# My Research");
  });

  it("respects maxDepth", () => {
    const tabs = makeTabs("Root", "Child", "Deep");
    const tree = buildTree(tabs, { 2: 1, 3: 2 }, []);
    const result = dumpContextAsMarkdown(tree, { maxDepth: 1 });

    expect(result).toContain("Root");
    expect(result).toContain("Child");
    expect(result).not.toContain("Deep");
  });
});

describe("dumpNodesAsMarkdown", () => {
  it("renders selected nodes", () => {
    const tabs = makeTabs("Selected1", "Selected2");
    const tree = buildTree(tabs, {}, []);
    const result = dumpNodesAsMarkdown(tree.children);

    expect(result).toContain("# Selected Tabs");
    expect(result).toContain("Selected1");
    expect(result).toContain("Selected2");
  });
});
