import { useTabStore } from "@ui/stores/tabStore";
import { HighlightLabel } from "./HighlightLabel";

export function SearchResults() {
  const searchResults = useTabStore((s) => s.searchResults);
  const bookmarkResults = useTabStore((s) => s.bookmarkResults);

  const handleTabClick = (tabId: number) => {
    chrome.tabs.update(tabId, { active: true }).catch(() => {});
  };

  if (searchResults.length === 0 && bookmarkResults.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--color-muted)]">
        No results found
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {searchResults.length > 0 && (
        <div>
          <div className="px-2 py-1 text-[10px] font-medium text-[var(--color-muted)] uppercase tracking-wide">
            Open Tabs ({searchResults.length})
          </div>
          {searchResults.map((result) => (
            <div
              key={result.tab.id}
              className="flex items-center gap-1.5 py-1 px-3 cursor-pointer hover:bg-[var(--color-hover)]"
              onClick={() => handleTabClick(result.tab.id)}
            >
              {result.tab.favIconUrl ? (
                <img src={result.tab.favIconUrl} alt="" className="w-4 h-4 shrink-0" />
              ) : (
                <div className="w-4 h-4 shrink-0 rounded-sm bg-[var(--color-border)]" />
              )}
              <HighlightLabel
                text={result.tab.title}
                highlights={result.titleHighlights}
                className="truncate flex-1 text-[13px]"
              />
            </div>
          ))}
        </div>
      )}
      {bookmarkResults.length > 0 && (
        <div>
          <div className="px-2 py-1 text-[10px] font-medium text-[var(--color-muted)] uppercase tracking-wide border-t border-[var(--color-border)]">
            Bookmarks ({bookmarkResults.length})
          </div>
          {bookmarkResults.map((result) => (
            <div
              key={`bk-${result.tab.id}`}
              className="flex items-center gap-1.5 py-1 px-3 cursor-pointer hover:bg-[var(--color-hover)]"
              onClick={() => window.open(result.tab.url)}
            >
              <span className="text-[var(--color-muted)] text-[12px]">★</span>
              <HighlightLabel
                text={result.tab.title}
                highlights={result.titleHighlights}
                className="truncate flex-1 text-[13px]"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
