import { useState, useCallback, useEffect, useRef } from "react";
import { useTabStore } from "@ui/stores/tabStore";
import { fuzzySearch } from "@core/SearchEngine";
import type { Tab } from "@core/types";

interface Command {
  id: string;
  label: string;
  icon: string;
  action: () => void;
}

interface PaletteItem {
  type: "tab" | "command";
  id: string;
  label: string;
  icon?: string;
  tab?: Tab;
  action: () => void;
}

export function CommandPalette() {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tabs = useTabStore((s) => s.tabs);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build command registry
  const commands: Command[] = [
    {
      id: "close-other-tabs",
      label: "Close other tabs",
      icon: "×",
      action: () => {
        const otherIds = tabs.filter((t) => !t.active).map((t) => t.id);
        if (otherIds.length > 0) {
          chrome.tabs.remove(otherIds).catch(() => {});
        }
      },
    },
  ];

  // Build palette items
  const items: PaletteItem[] = [];

  if (query) {
    // Fuzzy search tabs
    const tabResults = fuzzySearch(query, tabs);
    for (const result of tabResults.slice(0, 20)) {
      items.push({
        type: "tab",
        id: `tab-${result.tab.id}`,
        label: result.tab.title,
        tab: result.tab,
        action: () => {
          chrome.tabs.update(result.tab.id, { active: true }).catch(() => {});
          window.close();
        },
      });
    }

    // Filter commands
    const lowerQuery = query.toLowerCase();
    for (const cmd of commands) {
      if (cmd.label.toLowerCase().includes(lowerQuery)) {
        items.push({
          type: "command",
          id: cmd.id,
          label: cmd.label,
          icon: cmd.icon,
          action: () => {
            cmd.action();
            window.close();
          },
        });
      }
    }
  } else {
    // Show all tabs when no query
    for (const tab of tabs.slice(0, 30)) {
      items.push({
        type: "tab",
        id: `tab-${tab.id}`,
        label: tab.title,
        tab: tab,
        action: () => {
          chrome.tabs.update(tab.id, { active: true }).catch(() => {});
          window.close();
        },
      });
    }
  }

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (items[selectedIndex]) {
            items[selectedIndex].action();
          }
          break;
        case "Escape":
          window.close();
          break;
      }
    },
    [items, selectedIndex],
  );

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      {/* Search input */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--color-border)]">
        <span className="text-[var(--color-muted)] text-[12px]">⌘</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search tabs, commands..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[13px]
            text-[var(--color-fg)] placeholder:text-[var(--color-muted)]"
        />
      </div>

      {/* Results */}
      <div ref={listRef} className="flex-1 overflow-y-auto py-1">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`flex items-center gap-2 py-1.5 px-3 cursor-pointer text-[13px]
              ${i === selectedIndex ? "bg-[var(--color-active)]" : "hover:bg-[var(--color-hover)]"}`}
            onClick={item.action}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            {item.type === "tab" && item.tab?.favIconUrl ? (
              <img src={item.tab.favIconUrl} alt="" className="w-4 h-4 shrink-0" />
            ) : item.type === "command" ? (
              <span className="w-4 h-4 flex items-center justify-center text-[var(--color-muted)]">
                {item.icon}
              </span>
            ) : (
              <div className="w-4 h-4 shrink-0 rounded-sm bg-[var(--color-border)]" />
            )}
            <span className="truncate flex-1">{item.label}</span>
            {item.type === "command" && (
              <span className="text-[10px] text-[var(--color-muted)]">command</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
