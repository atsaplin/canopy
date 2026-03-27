import { useState, useCallback } from "react";
import type { FlatTreeItem } from "@core/types";
import { useTabStore } from "@ui/stores/tabStore";
import { useSettingsStore } from "@ui/stores/settingsStore";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { TabContextMenu } from "@ui/components/ContextMenu/TabContextMenu";

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

interface TabItemProps {
  item: FlatTreeItem;
}

export function TabItem({ item }: TabItemProps) {
  const { node, depth, isExpanded, descendantCount } = item;
  const activeTabId = useTabStore((s) => s.activeTabId);
  const toggleCollapse = useTabStore((s) => s.toggleCollapse);
  const selectNode = useTabStore((s) => s.selectNode);
  const selectedIds = useTabStore((s) => s.selectedIds);
  const tabDecayMap = useTabStore((s) => s.tabDecayMap);
  const tabActivityMap = useTabStore((s) => s.tabActivityMap);
  const indentSize = useSettingsStore((s) => s.indentSize);
  const showDecayIndicators = useSettingsStore((s) => s.showDecayIndicators);
  const alwaysShowTabAge = useSettingsStore((s) => s.alwaysShowTabAge);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const tab = node.tab;
  if (!tab) return null;

  const isActive = tab.id === activeTabId;
  const isSelected = selectedIds.has(node.id);
  const hasChildren = descendantCount > 0;
  const decayLevel = tabDecayMap[tab.id] ?? "fresh";
  const decayOpacity = showDecayIndicators
    ? (decayLevel === "decayed" ? "opacity-40" : decayLevel === "stale" ? "opacity-60" : decayLevel === "warm" ? "opacity-80" : "")
    : "";
  const paddingLeft = depth * indentSize + 8;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: node.id,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: node.id,
  });

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      window.getSelection()?.removeAllRanges();
      selectNode(node.id, e.shiftKey, e.ctrlKey || e.metaKey);
      return;
    }
    // Regular click clears selection but sets this as the anchor for future Shift+click
    useTabStore.setState({ selectedIds: new Set<string>(), lastSelectedId: node.id });
    chrome.tabs.update(tab.id, { active: true }).catch(() => {});
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    // × button closes just this tab — children get promoted to parent level
    chrome.runtime.sendMessage({ action: "CLOSE_TAB", tabId: tab.id }).catch(() => {});
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCollapse(node.id);
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <>
      <div
        ref={(el) => {
          setDragRef(el);
          setDropRef(el);
        }}
        className={`flex items-center gap-1.5 py-1 px-1 cursor-pointer group
          hover:bg-[var(--color-hover)] transition-all duration-200
          ${isActive ? "bg-[var(--color-active)] font-medium" : ""}
          ${isSelected && !isActive ? "bg-blue-500/10" : ""}
          ${isDragging ? "opacity-50" : decayOpacity}
          ${isOver ? "ring-2 ring-[var(--color-accent)] ring-inset" : ""}`}
        style={{ paddingLeft }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        aria-level={depth + 1}
        aria-selected={isActive}
        aria-expanded={hasChildren ? isExpanded : undefined}
        data-tab-id={tab.id}
        data-node-id={node.id}
        aria-label={tab.title}
        {...listeners}
        {...attributes}
        role="treeitem"
      >
        {/* Collapse toggle */}
        <button
          className={`w-4 h-4 flex items-center justify-center text-[10px] text-[var(--color-muted)]
            ${hasChildren ? "opacity-100" : "opacity-0"}`}
          onClick={handleToggle}
          tabIndex={-1}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {hasChildren && (isExpanded ? "▼" : "▶")}
        </button>

        {/* Favicon */}
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

        {/* Loading indicator */}
        {tab.status === "loading" && (
          <div className="w-3 h-3 shrink-0 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        )}

        {/* Title */}
        <span className="truncate flex-1 text-[13px]">{tab.title}</span>

        {/* Tab age / decay indicator */}
        {(() => {
          const lastAccessed = tabActivityMap[tab.id];
          const relTime = lastAccessed ? formatRelativeTime(lastAccessed) : "";
          // Always show age if setting is on, regardless of decay level
          if (alwaysShowTabAge && relTime) {
            const color = decayLevel === "decayed" ? "text-orange-400" : decayLevel === "stale" ? "text-yellow-500" : "text-[var(--color-muted)]";
            const emoji = showDecayIndicators && decayLevel === "decayed" ? "💤 " : showDecayIndicators && decayLevel === "stale" ? "⏳ " : "";
            return (
              <span className={`text-[10px] shrink-0 ${color}`} title={`Last visited ${relTime} ago`}>
                {emoji}{relTime}
              </span>
            );
          }
          // Otherwise only show for non-fresh tabs when decay indicators are on
          if (showDecayIndicators && decayLevel !== "fresh" && relTime) {
            if (decayLevel === "warm") {
              return (
                <span className="text-[10px] shrink-0 text-[var(--color-muted)]" title={`Last visited ${relTime} ago`}>
                  {relTime}
                </span>
              );
            }
            return (
              <span
                className={`text-[10px] shrink-0 ${decayLevel === "decayed" ? "text-orange-400" : "text-yellow-500"}`}
                title={`Last visited ${relTime} ago`}
              >
                {decayLevel === "decayed" ? "💤" : "⏳"} {relTime}
              </span>
            );
          }
          return null;
        })()}

        {/* Child count badge */}
        {hasChildren && !isExpanded && (
          <span className="text-[10px] text-[var(--color-muted)] px-1">
            {descendantCount}
          </span>
        )}

        {/* Close button */}
        <button
          className="w-4 h-4 flex items-center justify-center text-[var(--color-muted)]
            opacity-0 group-hover:opacity-100 hover:text-[var(--color-fg)] transition-opacity"
          onClick={handleClose}
          tabIndex={-1}
          aria-label="Close tab"
        >
          ×
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <TabContextMenu
          tab={tab}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
