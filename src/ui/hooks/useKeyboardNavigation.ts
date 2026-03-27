import { useCallback, useEffect, useState } from "react";
import { useTabStore } from "@ui/stores/tabStore";
import type { FlatTreeItem } from "@core/types";

export function useKeyboardNavigation() {
  const flatNodes = useTabStore((s) => s.flatNodes);
  const toggleCollapse = useTabStore((s) => s.toggleCollapse);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Clamp selected index when flat nodes change
  useEffect(() => {
    if (selectedIndex >= flatNodes.length) {
      setSelectedIndex(Math.max(0, flatNodes.length - 1));
    }
  }, [flatNodes.length, selectedIndex]);

  const selectedNode: FlatTreeItem | undefined = flatNodes[selectedIndex];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const currentNodes = useTabStore.getState().flatNodes;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, currentNodes.length - 1));
          break;

        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;

        case "ArrowRight":
          e.preventDefault();
          setSelectedIndex((prev) => {
            const node = currentNodes[prev];
            if (node && node.descendantCount > 0 && !node.isExpanded) {
              toggleCollapse(node.node.id);
              return prev;
            }
            return Math.min(prev + 1, currentNodes.length - 1);
          });
          break;

        case "ArrowLeft":
          e.preventDefault();
          setSelectedIndex((prev) => {
            const node = currentNodes[prev];
            if (!node) return prev;
            if (node.descendantCount > 0 && node.isExpanded) {
              toggleCollapse(node.node.id);
              return prev;
            }
            // Jump to parent
            if (node.depth > 0) {
              for (let i = prev - 1; i >= 0; i--) {
                if (currentNodes[i].depth < node.depth) {
                  return i;
                }
              }
            }
            return prev;
          });
          break;

        case "Enter":
          e.preventDefault();
          setSelectedIndex((prev) => {
            const node = currentNodes[prev];
            if (node?.node.tab) {
              chrome.tabs.update(node.node.tab.id, { active: true }).catch(() => {});
            } else if (node?.node.isGroup) {
              toggleCollapse(node.node.id);
            }
            return prev;
          });
          break;

        case "Delete":
        case "Backspace":
          e.preventDefault();
          setSelectedIndex((prev) => {
            const item = currentNodes[prev];
            if (item?.node.tab) {
              // Delete key closes just this tab — children get promoted
              chrome.runtime.sendMessage({
                action: "CLOSE_TAB",
                tabId: item.node.tab.id,
              }).catch(() => {});
            }
            return prev;
          });
          break;
      }
    },
    [toggleCollapse],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { selectedIndex, selectedNode };
}
