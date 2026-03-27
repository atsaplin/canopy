import { describe, it, expect } from "vitest";
import { filterTabs, fuzzySearch } from "@core/SearchEngine";
import type { Tab } from "@core/types";

const tabs: Tab[] = [
  { id: 1, title: "React Documentation", url: "https://react.dev", active: true, index: 0 },
  { id: 2, title: "GitHub Issues", url: "https://github.com/issues", active: false, index: 1 },
  { id: 3, title: "Stack Overflow", url: "https://stackoverflow.com/q/123", active: false, index: 2 },
];

describe("filterTabs", () => {
  it("returns all tabs for empty keyword", () => {
    const results = filterTabs("", tabs);
    expect(results).toHaveLength(3);
  });

  it("filters by title match", () => {
    const results = filterTabs("React", tabs);
    expect(results).toHaveLength(1);
    expect(results[0].tab.id).toBe(1);
  });

  it("filters by URL match", () => {
    const results = filterTabs("github.com", tabs);
    expect(results).toHaveLength(1);
    expect(results[0].tab.id).toBe(2);
  });

  it("is case-insensitive", () => {
    const results = filterTabs("react", tabs);
    expect(results).toHaveLength(1);
  });

  it("handles regex special characters safely", () => {
    const results = filterTabs("q/123", tabs);
    expect(results).toHaveLength(1);
    expect(results[0].tab.id).toBe(3);
  });

  it("returns highlight ranges", () => {
    const results = filterTabs("React", tabs);
    expect(results[0].titleHighlights.length).toBeGreaterThan(0);
    expect(results[0].titleHighlights[0]).toEqual({ start: 0, end: 5 });
  });

  it("returns empty array when no matches", () => {
    const results = filterTabs("xyznotfound", tabs);
    expect(results).toHaveLength(0);
  });
});

describe("fuzzySearch", () => {
  it("finds exact matches", () => {
    const results = fuzzySearch("React Documentation", tabs);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].tab.id).toBe(1);
  });

  it("finds substring matches", () => {
    const results = fuzzySearch("Stack", tabs);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].tab.id).toBe(3);
  });

  it("returns empty for no match", () => {
    const results = fuzzySearch("xyznotfound", tabs);
    expect(results).toHaveLength(0);
  });

  it("ranks better matches higher", () => {
    const moreTabs: Tab[] = [
      { id: 1, title: "React Docs", url: "https://react.dev", active: true, index: 0 },
      { id: 2, title: "Preact Info", url: "https://preact.dev", active: false, index: 1 },
    ];
    const results = fuzzySearch("react", moreTabs);
    expect(results[0].tab.id).toBe(1); // exact word match ranks higher
  });
});
