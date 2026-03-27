import { create } from "zustand";
import type { Tab, TabGroup, ParentMap, TabTreeNode, FlatTreeItem } from "@core/types";
import { buildTree } from "@core/TreeBuilder";
import { flattenTree, createRootNode } from "@core/TabTreeNode";
import { filterTabs } from "@core/SearchEngine";
import type { DecayLevel } from "@core/TabDecay";
import type { SearchResult } from "@core/types";

/** Rebuild tree from state — pure helper. */
function rebuild(
  tabs: Tab[],
  parentMap: ParentMap,
  tabGroups: TabGroup[],
  collapsedIds: Set<string>,
): { tree: TabTreeNode; flatNodes: FlatTreeItem[] } {
  const tree = buildTree(tabs, parentMap, tabGroups);
  return { tree, flatNodes: flattenTree(tree, collapsedIds) };
}

interface TabState {
  tabs: Tab[];
  tabGroups: TabGroup[];
  parentMap: ParentMap;
  activeTabId: number | null;
  tree: TabTreeNode;
  flatNodes: FlatTreeItem[];
  collapsedIds: Set<string>;
  searchKeyword: string;
  searchResults: SearchResult[];
  bookmarkResults: SearchResult[];
  bookmarkCache: Tab[] | null;
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  tabDecayMap: Record<number, DecayLevel>;
  tabActivityMap: Record<number, number>; // tabId -> last accessed timestamp
  searchFocusRequested: number; // timestamp — increment to trigger focus

  // Actions
  setTabs: (tabs: Tab[]) => void;
  setTabGroups: (groups: TabGroup[]) => void;
  setParentMap: (map: ParentMap) => void;
  setActiveTabId: (id: number | null) => void;
  setSearchKeyword: (keyword: string) => void;
  toggleCollapse: (nodeId: string) => void;
  setCollapsedIds: (ids: Set<string>) => void;
  setBookmarkCache: (bookmarks: Tab[]) => void;
  selectNode: (nodeId: string, shiftKey: boolean, ctrlKey: boolean) => void;
  clearSelection: () => void;
  updateDecayMap: (activity: Record<number, number>, staleThresholdHours?: number) => void;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  tabGroups: [],
  parentMap: {},
  activeTabId: null,
  tree: createRootNode(),
  flatNodes: [],
  collapsedIds: new Set<string>(),
  searchKeyword: "",
  searchResults: [],
  bookmarkResults: [],
  bookmarkCache: null,
  selectedIds: new Set<string>(),
  lastSelectedId: null,
  tabDecayMap: {},
  tabActivityMap: {},
  searchFocusRequested: 0,

  setTabs: (tabs) => {
    const state = get();
    set({ tabs, ...rebuild(tabs, state.parentMap, state.tabGroups, state.collapsedIds) });
  },

  setTabGroups: (groups) => {
    const state = get();
    set({ tabGroups: groups, ...rebuild(state.tabs, state.parentMap, groups, state.collapsedIds) });
  },

  setParentMap: (map) => {
    const state = get();
    set({ parentMap: map, ...rebuild(state.tabs, map, state.tabGroups, state.collapsedIds) });
  },

  setActiveTabId: (id) => set({ activeTabId: id }),

  setSearchKeyword: (keyword) => {
    const { tabs, bookmarkCache } = get();
    const searchResults = keyword ? filterTabs(keyword, tabs) : [];
    const bookmarkResults =
      keyword && bookmarkCache ? filterTabs(keyword, bookmarkCache) : [];
    set({ searchKeyword: keyword, searchResults, bookmarkResults });

    // Lazy-load bookmark cache on first search
    if (keyword && !bookmarkCache && typeof chrome !== "undefined" && chrome.bookmarks) {
      chrome.bookmarks.getTree().then((tree) => {
        const bookmarks: Tab[] = [];
        function walk(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
          for (const node of nodes) {
            if (node.url) {
              bookmarks.push({
                id: parseInt(node.id) || 0,
                title: node.title,
                url: node.url,
                active: false,
                index: 0,
                isBookmark: true,
              });
            }
            if (node.children) walk(node.children);
          }
        }
        walk(tree);
        set({ bookmarkCache: bookmarks });
        // Re-run search with the now-populated cache
        const currentKeyword = get().searchKeyword;
        if (currentKeyword) {
          const newBookmarkResults = filterTabs(currentKeyword, bookmarks);
          set({ bookmarkResults: newBookmarkResults });
        }
      }).catch(() => {});
    }
  },

  toggleCollapse: (nodeId) => {
    const { collapsedIds, tree } = get();
    const newCollapsed = new Set(collapsedIds);
    if (newCollapsed.has(nodeId)) {
      newCollapsed.delete(nodeId);
    } else {
      newCollapsed.add(nodeId);
    }
    set({
      collapsedIds: newCollapsed,
      flatNodes: flattenTree(tree, newCollapsed),
    });
  },

  setCollapsedIds: (ids) => {
    const { tree } = get();
    set({
      collapsedIds: ids,
      flatNodes: flattenTree(tree, ids),
    });
  },

  setBookmarkCache: (bookmarks) => set({ bookmarkCache: bookmarks }),

  selectNode: (nodeId, shiftKey, ctrlKey) => {
    const { selectedIds, lastSelectedId, flatNodes } = get();

    if (ctrlKey) {
      // Toggle individual
      const newSelected = new Set(selectedIds);
      if (newSelected.has(nodeId)) {
        newSelected.delete(nodeId);
      } else {
        newSelected.add(nodeId);
      }
      set({ selectedIds: newSelected, lastSelectedId: nodeId });
    } else if (shiftKey && lastSelectedId) {
      // Range select — replaces current selection with the range
      const startIdx = flatNodes.findIndex((n) => n.node.id === lastSelectedId);
      const endIdx = flatNodes.findIndex((n) => n.node.id === nodeId);
      if (startIdx >= 0 && endIdx >= 0) {
        const from = Math.min(startIdx, endIdx);
        const to = Math.max(startIdx, endIdx);
        const newSelected = new Set<string>();
        for (let i = from; i <= to; i++) {
          newSelected.add(flatNodes[i].node.id);
        }
        set({ selectedIds: newSelected });
      }
    } else {
      // Single select
      set({ selectedIds: new Set([nodeId]), lastSelectedId: nodeId });
    }
  },

  clearSelection: () => set({ selectedIds: new Set(), lastSelectedId: null }),

  updateDecayMap: (activity: Record<number, number>, staleThresholdHours = 24) => {
    const now = Date.now();
    const thresholdMs = staleThresholdHours * 3600_000;
    const decayMap: Record<number, DecayLevel> = {};
    for (const [tabIdStr, lastAccessed] of Object.entries(activity)) {
      const age = now - lastAccessed;
      decayMap[Number(tabIdStr)] = age >= thresholdMs ? "stale" : "fresh";
    }
    set({ tabDecayMap: decayMap, tabActivityMap: activity });
  },
}));
