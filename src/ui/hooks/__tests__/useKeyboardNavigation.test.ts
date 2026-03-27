import { describe, it, expect, beforeEach } from "vitest";
import { useTabStore } from "@ui/stores/tabStore";
import type { Tab } from "@core/types";

// Test the keyboard navigation logic through the store
// (the hook itself needs a React component to test, so we test the underlying data)
describe("keyboard navigation data", () => {
  beforeEach(() => {
    const tabs: Tab[] = [
      { id: 1, title: "Parent", url: "https://one.com", active: true, index: 0 },
      { id: 2, title: "Child 1", url: "https://two.com", active: false, index: 1 },
      { id: 3, title: "Child 2", url: "https://three.com", active: false, index: 2 },
      { id: 4, title: "Sibling", url: "https://four.com", active: false, index: 3 },
    ];
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
    useTabStore.getState().setTabs(tabs);
    useTabStore.getState().setParentMap({ 2: 1, 3: 1 });
  });

  it("produces flat nodes with correct depths for navigation", () => {
    const { flatNodes } = useTabStore.getState();
    expect(flatNodes).toHaveLength(4);
    expect(flatNodes[0].depth).toBe(0); // Parent (tab 1)
    expect(flatNodes[1].depth).toBe(1); // Child 1 (tab 2)
    expect(flatNodes[2].depth).toBe(1); // Child 2 (tab 3)
    expect(flatNodes[3].depth).toBe(0); // Sibling (tab 4)
  });

  it("collapse hides children from flat list", () => {
    useTabStore.getState().toggleCollapse("1");
    const { flatNodes } = useTabStore.getState();
    expect(flatNodes).toHaveLength(2); // Parent + Sibling
    expect(flatNodes[0].node.tab?.id).toBe(1);
    expect(flatNodes[1].node.tab?.id).toBe(4);
  });

  it("expand shows children again", () => {
    useTabStore.getState().toggleCollapse("1");
    useTabStore.getState().toggleCollapse("1");
    const { flatNodes } = useTabStore.getState();
    expect(flatNodes).toHaveLength(4);
  });

  it("arrow left on child navigates to parent index", () => {
    const { flatNodes } = useTabStore.getState();
    // Child 1 is at index 1, depth 1. Parent at depth 0 is at index 0.
    const childIndex = 1;
    let parentIndex = -1;
    for (let i = childIndex - 1; i >= 0; i--) {
      if (flatNodes[i].depth < flatNodes[childIndex].depth) {
        parentIndex = i;
        break;
      }
    }
    expect(parentIndex).toBe(0);
  });
});
