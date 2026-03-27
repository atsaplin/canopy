import { useCallback, useRef, useEffect } from "react";
import { useTabStore } from "@ui/stores/tabStore";

export function SearchInput() {
  const searchKeyword = useTabStore((s) => s.searchKeyword);
  const setSearchKeyword = useTabStore((s) => s.setSearchKeyword);
  const searchFocusRequested = useTabStore((s) => s.searchFocusRequested);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus when requested via store (triggered by Alt+S / Alt+F)
  useEffect(() => {
    if (searchFocusRequested > 0 && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [searchFocusRequested]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearchKeyword(value);
      }, 100);
    },
    [setSearchKeyword],
  );

  const handleClear = useCallback(() => {
    setSearchKeyword("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }, [setSearchKeyword]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const firstResult = document.querySelector<HTMLElement>("[data-search-result]");
      firstResult?.focus();
    } else if (e.key === "Escape") {
      if (inputRef.current?.value) {
        setSearchKeyword("");
        if (inputRef.current) inputRef.current.value = "";
      } else {
        inputRef.current?.blur();
      }
    }
  }, [setSearchKeyword]);

  return (
    <div className="flex items-center gap-1 px-2 py-1.5">
      <svg
        className="w-3.5 h-3.5 text-[var(--color-muted)] shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search tabs..."
        defaultValue={searchKeyword}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        data-search-input
        className="flex-1 bg-transparent border-none outline-none text-[13px]
          text-[var(--color-fg)] placeholder:text-[var(--color-muted)]"
        autoFocus
      />
      {searchKeyword && (
        <button
          onClick={handleClear}
          className="text-[var(--color-muted)] hover:text-[var(--color-fg)] text-sm"
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
}
