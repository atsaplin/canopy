import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Tab } from "@core/types";
import { useTabStore } from "@ui/stores/tabStore";
import { useSettingsStore } from "@ui/stores/settingsStore";
import { getDescendantsFromParentMap } from "@ui/utils/closeHelpers";
import { findNodeById } from "@core/TabTreeNode";
import { serializeNodes } from "@core/SessionSerializer";
import { dumpNodesAsMarkdown } from "@core/ContextDumper";

interface MenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
  separator?: boolean;
  hidden?: boolean;
}

interface TabContextMenuProps {
  tab: Tab;
  x: number;
  y: number;
  onClose: () => void;
}

export function TabContextMenu({ tab, x, y, onClose }: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Use setTimeout so the opening right-click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 10);
    document.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menuRef.current.style.left = `${window.innerWidth - rect.width - 4}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const items: MenuItem[] = [
    {
      label: (() => {
        const { selectedIds } = useTabStore.getState();
        return selectedIds.size > 1 ? `Close ${selectedIds.size} tabs` : "Close tab";
      })(),
      action: () => {
        const { selectedIds } = useTabStore.getState();
        if (selectedIds.size > 1 && selectedIds.has(String(tab.id))) {
          // Close all selected tabs
          const ids = Array.from(selectedIds).map(Number).filter((id) => !isNaN(id));
          if (ids.length > 0) chrome.tabs.remove(ids).catch(() => {});
        } else {
          chrome.runtime.sendMessage({ action: "CLOSE_TAB", tabId: tab.id }).catch(() => {});
        }
        useTabStore.getState().clearSelection();
        onClose();
      },
    },
    {
      label: "Close tree",
      action: () => {
        const { confirmCloseTree } = useSettingsStore.getState();
        const { tree, parentMap } = useTabStore.getState();
        const descendantIds = getDescendantsFromParentMap(tab.id, tree, parentMap);
        if (confirmCloseTree && descendantIds.length > 0) {
          if (!confirm(`Close this tab and ${descendantIds.length} descendant${descendantIds.length > 1 ? "s" : ""}?`)) {
            onClose();
            return;
          }
        }
        chrome.runtime.sendMessage({ action: "CLOSE_TAB_TREE", tabId: tab.id, descendantIds }).catch(() => {});
        onClose();
      },
      // Only show if this tab has children
      hidden: (() => {
        const { tree } = useTabStore.getState();
        const node = findNodeById(tree, String(tab.id));
        return !node || node.children.length === 0;
      })(),
    },
    {
      label: "Close children",
      action: () => {
        // Close only the children, keep this tab
        const { tree, parentMap } = useTabStore.getState();
        const descendantIds = getDescendantsFromParentMap(tab.id, tree, parentMap);
        if (descendantIds.length > 0) {
          chrome.tabs.remove(descendantIds).catch(() => {});
        }
        onClose();
      },
      // Only show if this tab has children
      hidden: (() => {
        const { tree } = useTabStore.getState();
        const node = findNodeById(tree, String(tab.id));
        return !node || node.children.length === 0;
      })(),
    },
    {
      label: "Close tabs below",
      action: async () => {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const belowIds = tabs.filter((t) => t.index > tab.index).map((t) => t.id!).filter(Boolean);
        if (belowIds.length > 0) chrome.tabs.remove(belowIds).catch(() => {});
        onClose();
      },
      separator: true,
    },
    {
      label: "Duplicate tab",
      action: () => {
        chrome.tabs.duplicate(tab.id).catch(() => {});
        onClose();
      },
    },
    {
      label: "Detach from parent",
      action: () => {
        chrome.runtime.sendMessage({ action: "REPARENT_TAB", tabId: tab.id, newParentId: null }).catch(() => {});
        onClose();
      },
    },
    {
      label: "Move to new window",
      action: () => {
        chrome.windows.create({ tabId: tab.id }).catch(() => {});
        onClose();
      },
      separator: true,
    },
    {
      label: "Copy URL",
      action: () => {
        navigator.clipboard.writeText(tab.url).catch(() => {});
        onClose();
      },
    },
    {
      label: "Copy as JSON",
      action: () => {
        const { tree, selectedIds } = useTabStore.getState();
        let nodes;
        if (selectedIds.size > 1 && selectedIds.has(String(tab.id))) {
          // Multi-select: copy all selected nodes
          nodes = Array.from(selectedIds)
            .map((id) => findNodeById(tree, id))
            .filter((n): n is NonNullable<typeof n> => n !== undefined);
        } else {
          // Single: copy this tab's subtree
          const treeNode = findNodeById(tree, String(tab.id));
          nodes = treeNode ? [treeNode] : [];
        }
        if (nodes.length > 0) {
          const sessionNodes = serializeNodes(nodes);
          const json = JSON.stringify(sessionNodes, null, 2);
          navigator.clipboard.writeText(json).catch(() => {});
        }
        onClose();
      },
      separator: true,
    },
    {
      label: "Copy context for AI",
      action: () => {
        const { tree } = useTabStore.getState();
        const treeNode = findNodeById(tree, String(tab.id));
        if (treeNode) {
          const markdown = dumpNodesAsMarkdown(
            [treeNode],
            { title: `Context: ${tab.title}` },
          );
          navigator.clipboard.writeText(markdown).catch(() => {});
        }
        onClose();
      },
    },
  ];

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] py-1 rounded-md shadow-lg
        border border-[var(--color-border)]"
      style={{
        left: x,
        top: y,
        backgroundColor: "var(--color-bg)",
      }}
    >
      {items.filter((item) => !item.hidden).map((item, i) => (
        <div key={i}>
          <button
            className={`w-full text-left px-3 py-1.5 text-[13px]
              hover:bg-[var(--color-hover)] transition-colors
              ${item.danger ? "text-red-500" : "text-[var(--color-fg)]"}`}
            style={{ backgroundColor: "transparent" }}
            onClick={item.action}
          >
            {item.label}
          </button>
          {item.separator && (
            <div className="my-0.5 border-t border-[var(--color-border)]" />
          )}
        </div>
      ))}
    </div>
  );

  // Render via portal at body level to escape transform containers
  return createPortal(menu, document.body);
}
