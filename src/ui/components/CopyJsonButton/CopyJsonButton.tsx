import { useState, useCallback } from "react";
import { useTabStore } from "@ui/stores/tabStore";
import { findNodeById } from "@core/TabTreeNode";
import { serializeNodes } from "@core/SessionSerializer";

export function CopyJsonButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const { tree, selectedIds } = useTabStore.getState();

    let nodes;
    if (selectedIds.size > 0) {
      nodes = Array.from(selectedIds)
        .map((id) => findNodeById(tree, id))
        .filter((n): n is NonNullable<typeof n> => n !== undefined);
    } else {
      // Copy entire tree's children (all top-level tabs)
      nodes = tree.children;
    }

    if (nodes.length > 0) {
      const sessionNodes = serializeNodes(nodes);
      const json = JSON.stringify(sessionNodes, null, 2);
      navigator.clipboard.writeText(json).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }, []);

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 px-1.5 py-0.5 text-[12px] rounded transition-colors
        ${copied
          ? "text-green-500 bg-green-500/10"
          : "text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-hover)]"
        }`}
      title={copied ? "Copied!" : "Copy as JSON (selection or all tabs)"}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
      )}
    </button>
  );
}
