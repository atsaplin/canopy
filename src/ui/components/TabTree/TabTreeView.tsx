import { useTabStore } from "@ui/stores/tabStore";
import { TabItem } from "@ui/components/TabItem/TabItem";
import { GroupItem } from "@ui/components/TabItem/GroupItem";
import { useEffect, useRef } from "react";
import { useKeyboardNavigation } from "@ui/hooks/useKeyboardNavigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

export function TabTreeView() {
  const flatNodes = useTabStore((s) => s.flatNodes);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectedIndex } = useKeyboardNavigation();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 28,
    overscan: 10,
  });

  // Auto-scroll to active tab
  useEffect(() => {
    if (activeTabId === null) return;
    const idx = flatNodes.findIndex((item) => item.node.tab?.id === activeTabId);
    if (idx >= 0) {
      virtualizer.scrollToIndex(idx, { align: "auto", behavior: "smooth" });
    }
  }, [activeTabId, flatNodes, virtualizer]);

  // Scroll selected item into view for keyboard navigation
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < flatNodes.length) {
      virtualizer.scrollToIndex(selectedIndex, { align: "auto" });
    }
  }, [selectedIndex, flatNodes.length, virtualizer]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedId = String(active.id);
    const targetId = String(over.id);

    // Find the dragged node — only allow tab reparenting
    const draggedItem = flatNodes.find((item) => item.node.id === draggedId);
    const targetItem = flatNodes.find((item) => item.node.id === targetId);

    if (!draggedItem?.node.tab || !targetItem) return;

    const tabId = draggedItem.node.tab.id;

    if (targetItem.node.tab) {
      // Re-parent to target tab
      chrome.runtime.sendMessage({
        action: "REPARENT_TAB",
        tabId,
        newParentId: targetItem.node.tab.id,
      });
    } else if (targetItem.node.isGroup && targetItem.node.group) {
      // Add to group
      chrome.runtime.sendMessage({
        action: "GROUP_TABS",
        tabIds: [tabId],
        groupId: targetItem.node.group.id,
      });
    }
  };

  if (flatNodes.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--color-muted)]">
        No tabs found
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto select-none"
        role="tree"
        style={{ contain: "strict" }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = flatNodes[virtualItem.index];
            const isSelected = virtualItem.index === selectedIndex;

            return (
              <div
                key={item.node.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                data-selected={isSelected || undefined}
                data-node-id={item.node.id}
                className={isSelected ? "ring-1 ring-inset ring-[var(--color-accent)]" : ""}
              >
                {item.node.isGroup ? (
                  <GroupItem item={item} />
                ) : (
                  <TabItem item={item} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}
