import { useTabStore } from "@ui/stores/tabStore";

export function CompactTabList() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const searchKeyword = useTabStore((s) => s.searchKeyword);
  const searchResults = useTabStore((s) => s.searchResults);

  const displayTabs = searchKeyword
    ? searchResults.map((r) => r.tab)
    : tabs;

  const handleClick = (tabId: number) => {
    chrome.tabs.update(tabId, { active: true }).catch(() => {});
    window.close();
  };

  if (displayTabs.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--color-muted)] text-[13px]">
        {searchKeyword ? "No matching tabs" : "No tabs open"}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {displayTabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex items-center gap-2 py-1.5 px-3 cursor-pointer
            hover:bg-[var(--color-hover)] transition-colors duration-75
            ${tab.id === activeTabId ? "bg-[var(--color-active)]" : ""}`}
          onClick={() => handleClick(tab.id)}
        >
          {tab.favIconUrl ? (
            <img
              src={tab.favIconUrl}
              alt=""
              className="w-4 h-4 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-4 h-4 shrink-0 rounded-sm bg-[var(--color-border)]" />
          )}
          <span className="truncate text-[13px]">{tab.title}</span>
        </div>
      ))}
    </div>
  );
}
