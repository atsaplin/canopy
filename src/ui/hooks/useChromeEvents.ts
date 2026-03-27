import { useEffect, useRef } from "react";
import { useTabStore } from "@ui/stores/tabStore";
import { isDomainEvent } from "@shared/types/events";
import type { DomainEvent } from "@shared/types/events";
import type { Tab, TabGroup } from "@core/types";

const VALID_STATUSES = new Set(["loading", "complete", "unloaded"]);

/** Convert a Chrome tab to our Tab type. */
function chromeTabToTab(tab: chrome.tabs.Tab): Tab {
  const status = VALID_STATUSES.has(tab.status ?? "")
    ? (tab.status as Tab["status"])
    : undefined;
  return {
    id: tab.id ?? 0,
    title: tab.title ?? "",
    url: tab.url ?? "",
    favIconUrl: tab.favIconUrl,
    active: tab.active ?? false,
    index: tab.index,
    groupId: tab.groupId,
    openerTabId: tab.openerTabId,
    status,
    pinned: tab.pinned,
    mutedInfo: tab.mutedInfo ? { muted: tab.mutedInfo.muted } : undefined,
  };
}

/** Convert a Chrome tab group to our TabGroup type. */
function chromeGroupToGroup(group: chrome.tabGroups.TabGroup): TabGroup {
  return {
    id: group.id,
    title: group.title,
    color: group.color as TabGroup["color"],
    collapsed: group.collapsed,
  };
}

/** Load initial data from Chrome APIs and subscribe to service worker events. */
export function useChromeEvents() {
  const { setTabs, setTabGroups, setParentMap, setActiveTabId } = useTabStore();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshVersionRef = useRef(0);

  useEffect(() => {
    async function loadData() {
      const version = ++refreshVersionRef.current;
      try {
        const chromeTabs = await chrome.tabs.query({ currentWindow: true });
        // Discard stale response if a newer refresh was triggered
        if (version !== refreshVersionRef.current) return;

        const tabs = chromeTabs.map(chromeTabToTab);
        setTabs(tabs);

        const activeTab = tabs.find((t) => t.active);
        if (activeTab) setActiveTabId(activeTab.id);

        if (chrome.tabGroups) {
          const groups = await chrome.tabGroups.query({});
          if (version !== refreshVersionRef.current) return;
          setTabGroups(groups.map(chromeGroupToGroup));
        }

        const result = await chrome.storage.local.get("canopy");
        if (version !== refreshVersionRef.current) return;
        const canopyData = result.canopy as { tabParentMap?: Record<number, number> } | undefined;
        if (canopyData?.tabParentMap) {
          setParentMap(canopyData.tabParentMap);
        }

        // Load tab activity for decay visualization (separate storage key)
        const activityResult = await chrome.storage.local.get("canopy_activity");
        if (version !== refreshVersionRef.current) return;
        const activity = activityResult.canopy_activity as Record<number, number> | undefined;
        if (activity) {
          useTabStore.getState().updateDecayMap(activity);
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    }

    /** Debounced refresh — coalesces rapid events into a single loadData call. */
    function scheduleRefresh() {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        loadData();
      }, 80);
    }

    loadData();

    function handleMessage(message: unknown) {
      if (!isDomainEvent(message)) return;
      const event = message as DomainEvent;

      switch (event.type) {
        case "SW_READY":
          loadData();
          break;
        case "TAB_CREATED":
        case "TAB_REMOVED":
        case "TAB_MOVED":
        case "TAB_ATTACHED":
        case "TAB_DETACHED":
          scheduleRefresh();
          break;
        case "TAB_UPDATED": {
          const store = useTabStore.getState();
          const updatedTabs = store.tabs.map((t) =>
            t.id === event.tabId
              ? {
                  ...t,
                  ...(event.changeInfo.title !== undefined && { title: event.changeInfo.title }),
                  ...(event.changeInfo.url !== undefined && { url: event.changeInfo.url }),
                  ...(event.changeInfo.favIconUrl !== undefined && {
                    favIconUrl: event.changeInfo.favIconUrl,
                  }),
                  ...(event.changeInfo.status !== undefined && {
                    status: VALID_STATUSES.has(event.changeInfo.status)
                      ? (event.changeInfo.status as Tab["status"])
                      : undefined,
                  }),
                }
              : t,
          );
          setTabs(updatedTabs);
          break;
        }
        case "TAB_ACTIVATED":
          setActiveTabId(event.tabId);
          break;
        case "GROUP_CREATED":
        case "GROUP_REMOVED":
        case "GROUP_UPDATED":
          if (chrome.tabGroups) {
            chrome.tabGroups.query({}).then((groups) => {
              setTabGroups(groups.map(chromeGroupToGroup));
            }).catch(() => {});
          }
          break;
        case "PARENT_MAP_CHANGED":
          setParentMap(event.parentMap);
          break;
        case "COMMAND":
          if (event.command === "focus-search") {
            // Focus the search input in the side panel
            const searchInput = document.querySelector<HTMLInputElement>("[data-search-input]");
            searchInput?.focus();
          } else if (event.command === "copy-context") {
            // Trigger context dump button click
            const contextBtn = document.querySelector<HTMLButtonElement>("[data-context-dump]");
            contextBtn?.click();
          } else if (event.command === "save-session") {
            // Trigger save session button click
            const saveBtn = document.querySelector<HTMLButtonElement>("[data-save-session]");
            saveBtn?.click();
          }
          break;
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage);

    function handleStorageChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) {
      if (areaName !== "local" || !changes.canopy) return;
      const newData = changes.canopy.newValue as { tabParentMap?: Record<number, number> } | undefined;
      if (newData?.tabParentMap) {
        setParentMap(newData.tabParentMap);
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      chrome.runtime.onMessage.removeListener(handleMessage);
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [setTabs, setTabGroups, setParentMap, setActiveTabId]);
}
