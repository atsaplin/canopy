import { useEffect } from "react";
import { SearchInput } from "@ui/components/Search/SearchInput";
import { TabTreeView } from "@ui/components/TabTree/TabTreeView";
import { useChromeEvents } from "@ui/hooks/useChromeEvents";
import { useTabStore } from "@ui/stores/tabStore";
import { SearchResults } from "@ui/components/Search/SearchResults";
import { SessionsDropdown } from "@ui/components/Sessions/SessionsDropdown";
import { ContextDumpButton } from "@ui/components/ContextDump/ContextDumpButton";
import { CopyJsonButton } from "@ui/components/CopyJsonButton/CopyJsonButton";
import { useSettingsStore } from "@ui/stores/settingsStore";

export function App() {
  useChromeEvents();
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  // Notify service worker of panel open/close for toggle behavior
  useEffect(() => {
    chrome.windows.getCurrent().then((w) => {
      if (w.id !== undefined) {
        chrome.runtime.sendMessage({ action: "SIDE_PANEL_OPENED", windowId: w.id }).catch(() => {});
      }
    });
    const handleUnload = () => {
      chrome.windows.getCurrent().then((w) => {
        if (w.id !== undefined) {
          chrome.runtime.sendMessage({ action: "SIDE_PANEL_CLOSED", windowId: w.id }).catch(() => {});
        }
      });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  useEffect(() => {
    loadSettings();
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== "local") return;
      if (changes.canopy_settings) {
        loadSettings().then(() => {
          const { tabActivityMap } = useTabStore.getState();
          const { staleThresholdHours } = useSettingsStore.getState();
          if (Object.keys(tabActivityMap).length > 0) {
            useTabStore.getState().updateDecayMap(tabActivityMap, staleThresholdHours);
          }
        });
      }
      // Handle global shortcut commands via storage
      if (changes.canopy_command?.newValue) {
        const { command } = changes.canopy_command.newValue as { command: string };
        if (command === "copy-context") {
          const btn = document.querySelector<HTMLButtonElement>("[data-context-dump]");
          btn?.click();
        } else if (command === "save-session") {
          const btn = document.querySelector<HTMLButtonElement>("[data-save-session]");
          btn?.click();
        }
        chrome.storage.local.remove("canopy_command").catch(() => {});
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [loadSettings]);

  const searchKeyword = useTabStore((s) => s.searchKeyword);

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <div className="flex items-center border-b border-[var(--color-border)]">
        <div className="flex-1">
          <SearchInput />
        </div>
        <div className="flex items-center px-1 gap-0.5">
          <CopyJsonButton />
          <ContextDumpButton />
          <SessionsDropdown />
        </div>
      </div>
      {searchKeyword ? <SearchResults /> : <TabTreeView />}
    </div>
  );
}
