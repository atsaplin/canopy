import { SearchInput } from "@ui/components/Search/SearchInput";
import { TabTreeView } from "@ui/components/TabTree/TabTreeView";
import { useChromeEvents } from "@ui/hooks/useChromeEvents";
import { useTabStore } from "@ui/stores/tabStore";
import { SearchResults } from "@ui/components/Search/SearchResults";
import { SessionsDropdown } from "@ui/components/Sessions/SessionsDropdown";
import { ContextDumpButton } from "@ui/components/ContextDump/ContextDumpButton";

export function App() {
  useChromeEvents();

  const searchKeyword = useTabStore((s) => s.searchKeyword);

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <div className="flex items-center border-b border-[var(--color-border)]">
        <div className="flex-1">
          <SearchInput />
        </div>
        <div className="flex items-center px-1 gap-0.5">
          <ContextDumpButton />
          <SessionsDropdown />
        </div>
      </div>
      {searchKeyword ? <SearchResults /> : <TabTreeView />}
    </div>
  );
}
