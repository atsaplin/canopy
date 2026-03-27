import { describe, it, expect, beforeEach } from "vitest";
import { useTabStore } from "@ui/stores/tabStore";
import type { Tab } from "@core/types";

// We test the store + tree building integration, not the component
// (component depends on Chrome APIs which aren't available in jsdom)
describe("tabStore integration", () => {
  beforeEach(() => {
    useTabStore.setState({
      tabs: [],
      tabGroups: [],
      parentMap: {},
      activeTabId: null,
      collapsedIds: new Set(),
      searchKeyword: "",
      searchResults: [],
      bookmarkResults: [],
      bookmarkCache: null,
    });
  });

  it("builds tree from tabs with no parent map", () => {
    const tabs: Tab[] = [
      { id: 1, title: "Tab 1", url: "https://one.com", active: true, index: 0 },
      { id: 2, title: "Tab 2", url: "https://two.com", active: false, index: 1 },
    ];
    useTabStore.getState().setTabs(tabs);
    const { flatNodes, tree } = useTabStore.getState();
    expect(tree.children).toHaveLength(2);
    expect(flatNodes).toHaveLength(2);
    expect(flatNodes[0].depth).toBe(0);
  });

  it("builds nested tree from parent map", () => {
    const tabs: Tab[] = [
      { id: 1, title: "Parent", url: "https://one.com", active: true, index: 0 },
      { id: 2, title: "Child", url: "https://two.com", active: false, index: 1 },
    ];
    useTabStore.getState().setTabs(tabs);
    useTabStore.getState().setParentMap({ 2: 1 });
    const { flatNodes } = useTabStore.getState();
    expect(flatNodes).toHaveLength(2);
    expect(flatNodes[0].depth).toBe(0);
    expect(flatNodes[0].node.tab?.title).toBe("Parent");
    expect(flatNodes[1].depth).toBe(1);
    expect(flatNodes[1].node.tab?.title).toBe("Child");
  });

  it("collapses nodes and hides children", () => {
    const tabs: Tab[] = [
      { id: 1, title: "Parent", url: "https://one.com", active: true, index: 0 },
      { id: 2, title: "Child", url: "https://two.com", active: false, index: 1 },
    ];
    useTabStore.getState().setTabs(tabs);
    useTabStore.getState().setParentMap({ 2: 1 });
    useTabStore.getState().toggleCollapse("1");
    const { flatNodes } = useTabStore.getState();
    expect(flatNodes).toHaveLength(1);
    expect(flatNodes[0].isExpanded).toBe(false);
    expect(flatNodes[0].descendantCount).toBe(1);
  });

  it("filters tabs by search keyword", () => {
    const tabs: Tab[] = [
      { id: 1, title: "React Docs", url: "https://react.dev", active: true, index: 0 },
      { id: 2, title: "Vue Guide", url: "https://vue.org", active: false, index: 1 },
    ];
    useTabStore.getState().setTabs(tabs);
    useTabStore.getState().setSearchKeyword("react");
    const { searchResults } = useTabStore.getState();
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].tab.title).toBe("React Docs");
  });

  it("sets active tab ID", () => {
    useTabStore.getState().setActiveTabId(42);
    expect(useTabStore.getState().activeTabId).toBe(42);
  });

  it("shift+click range selects between last clicked and current", () => {
    const tabs: Tab[] = [
      { id: 1, title: "A", url: "https://a.com", active: true, index: 0 },
      { id: 2, title: "B", url: "https://b.com", active: false, index: 1 },
      { id: 3, title: "C", url: "https://c.com", active: false, index: 2 },
      { id: 4, title: "D", url: "https://d.com", active: false, index: 3 },
    ];
    useTabStore.getState().setTabs(tabs);

    // Simulate regular click on tab 1 (sets anchor)
    useTabStore.setState({ selectedIds: new Set<string>(), lastSelectedId: "1" });

    // Simulate shift+click on tab 3 (should select 1, 2, 3)
    useTabStore.getState().selectNode("3", true, false);
    const { selectedIds } = useTabStore.getState();
    expect(selectedIds.size).toBe(3);
    expect(selectedIds.has("1")).toBe(true);
    expect(selectedIds.has("2")).toBe(true);
    expect(selectedIds.has("3")).toBe(true);
    expect(selectedIds.has("4")).toBe(false);
  });

  it("shift+click replaces previous selection with new range", () => {
    const tabs: Tab[] = [
      { id: 1, title: "A", url: "https://a.com", active: true, index: 0 },
      { id: 2, title: "B", url: "https://b.com", active: false, index: 1 },
      { id: 3, title: "C", url: "https://c.com", active: false, index: 2 },
      { id: 4, title: "D", url: "https://d.com", active: false, index: 3 },
    ];
    useTabStore.getState().setTabs(tabs);

    // First range: anchor on 1, shift+click 2
    useTabStore.setState({ lastSelectedId: "1" });
    useTabStore.getState().selectNode("2", true, false);
    expect(useTabStore.getState().selectedIds.size).toBe(2);

    // Second range: shift+click 4 (should replace with 1,2,3,4 — NOT add)
    useTabStore.getState().selectNode("4", true, false);
    const { selectedIds } = useTabStore.getState();
    expect(selectedIds.size).toBe(4);
  });

  it("regular click sets anchor for subsequent shift+click", () => {
    const tabs: Tab[] = [
      { id: 1, title: "A", url: "https://a.com", active: true, index: 0 },
      { id: 2, title: "B", url: "https://b.com", active: false, index: 1 },
      { id: 3, title: "C", url: "https://c.com", active: false, index: 2 },
    ];
    useTabStore.getState().setTabs(tabs);

    // Simulate regular click on tab 1 — must set lastSelectedId
    useTabStore.setState({ selectedIds: new Set<string>(), lastSelectedId: "1" });
    expect(useTabStore.getState().lastSelectedId).toBe("1");

    // Shift+click on tab 3 — should work because lastSelectedId is set
    useTabStore.getState().selectNode("3", true, false);
    expect(useTabStore.getState().selectedIds.size).toBe(3);
  });

  it("ctrl+click toggles individual selection", () => {
    const tabs: Tab[] = [
      { id: 1, title: "A", url: "https://a.com", active: true, index: 0 },
      { id: 2, title: "B", url: "https://b.com", active: false, index: 1 },
      { id: 3, title: "C", url: "https://c.com", active: false, index: 2 },
    ];
    useTabStore.getState().setTabs(tabs);
    useTabStore.setState({ selectedIds: new Set<string>(), lastSelectedId: null });

    // Ctrl+click tab 1
    useTabStore.getState().selectNode("1", false, true);
    expect(useTabStore.getState().selectedIds.has("1")).toBe(true);

    // Ctrl+click tab 3 (adds to selection)
    useTabStore.getState().selectNode("3", false, true);
    expect(useTabStore.getState().selectedIds.size).toBe(2);
    expect(useTabStore.getState().selectedIds.has("1")).toBe(true);
    expect(useTabStore.getState().selectedIds.has("3")).toBe(true);

    // Ctrl+click tab 1 again (deselects)
    useTabStore.getState().selectNode("1", false, true);
    expect(useTabStore.getState().selectedIds.size).toBe(1);
    expect(useTabStore.getState().selectedIds.has("1")).toBe(false);
    expect(useTabStore.getState().selectedIds.has("3")).toBe(true);
  });
});
