import { useState, useCallback, useEffect, useRef } from "react";
import { useTabStore } from "@ui/stores/tabStore";
import { HighlightLabel } from "./HighlightLabel";

export function SearchResults() {
  const searchResults = useTabStore((s) => s.searchResults);
  const bookmarkResults = useTabStore((s) => s.bookmarkResults);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // All results combined for keyboard navigation
  const allResults = [
    ...searchResults.map((r) => ({ type: "tab" as const, result: r })),
    ...bookmarkResults.map((r) => ({ type: "bookmark" as const, result: r })),
  ];

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults, bookmarkResults]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-result-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const activateResult = useCallback((index: number) => {
    const item = allResults[index];
    if (!item) return;
    if (item.type === "tab") {
      chrome.tabs.update(item.result.tab.id, { active: true }).catch(() => {});
    } else {
      window.open(item.result.tab.url);
    }
  }, [allResults]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (selectedIndex === 0) {
          // Jump back to search input
          const input = document.querySelector<HTMLInputElement>("[data-search-input]");
          input?.focus();
        } else {
          setSelectedIndex((i) => Math.max(i - 1, 0));
        }
        break;
      case "Enter":
        e.preventDefault();
        activateResult(selectedIndex);
        break;
      case "Escape": {
        e.preventDefault();
        // Clear search and return to tree view
        useTabStore.getState().setSearchKeyword("");
        const input = document.querySelector<HTMLInputElement>("[data-search-input]");
        if (input) {
          input.value = "";
          input.focus();
        }
        break;
      }
    }
  }, [selectedIndex, allResults.length, activateResult]);

  if (allResults.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--color-muted)]">
        No results found
      </div>
    );
  }

  let resultIndex = 0;

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {searchResults.length > 0 && (
        <div>
          <div className="px-2 py-1 text-[10px] font-medium text-[var(--color-muted)] uppercase tracking-wide">
            Open Tabs ({searchResults.length})
          </div>
          {searchResults.map((result) => {
            const idx = resultIndex++;
            return (
              <div
                key={result.tab.id}
                data-search-result
                data-result-index={idx}
                tabIndex={-1}
                className={`flex items-center gap-1.5 py-1 px-3 cursor-pointer transition-colors
                  ${idx === selectedIndex ? "bg-[var(--color-active)]" : "hover:bg-[var(--color-hover)]"}`}
                onClick={() => {
                  setSelectedIndex(idx);
                  chrome.tabs.update(result.tab.id, { active: true }).catch(() => {});
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
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
            );
          })}
        </div>
      )}
      {bookmarkResults.length > 0 && (
        <div>
          <div className="px-2 py-1 text-[10px] font-medium text-[var(--color-muted)] uppercase tracking-wide border-t border-[var(--color-border)]">
            Bookmarks ({bookmarkResults.length})
          </div>
          {bookmarkResults.map((result) => {
            const idx = resultIndex++;
            return (
              <div
                key={`bk-${result.tab.id}`}
                data-search-result
                data-result-index={idx}
                tabIndex={-1}
                className={`flex items-center gap-1.5 py-1 px-3 cursor-pointer transition-colors
                  ${idx === selectedIndex ? "bg-[var(--color-active)]" : "hover:bg-[var(--color-hover)]"}`}
                onClick={() => {
                  setSelectedIndex(idx);
                  window.open(result.tab.url);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span className="text-[var(--color-muted)] text-[12px]">★</span>
                <HighlightLabel
                  text={result.tab.title}
                  highlights={result.titleHighlights}
                  className="truncate flex-1 text-[13px]"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
