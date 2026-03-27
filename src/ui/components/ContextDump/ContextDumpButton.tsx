import { useState, useCallback } from "react";
import { useTabStore } from "@ui/stores/tabStore";
import { dumpContextAsMarkdown, dumpNodesAsMarkdown } from "@core/ContextDumper";
import { findNodeById } from "@core/TabTreeNode";

export function ContextDumpButton() {
  const [copied, setCopied] = useState(false);

  const handleCopyContext = useCallback(() => {
    const { tree, selectedIds } = useTabStore.getState();

    let markdown: string;

    if (selectedIds.size > 0) {
      // Dump selected nodes only
      const selectedNodes = Array.from(selectedIds)
        .map((id) => findNodeById(tree, id))
        .filter((n): n is NonNullable<typeof n> => n !== undefined);
      markdown = dumpNodesAsMarkdown(selectedNodes, { title: "Selected Browsing Context" });
    } else {
      // Dump entire tree
      markdown = dumpContextAsMarkdown(tree);
    }

    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, []);

  return (
    <button
      data-context-dump
      onClick={handleCopyContext}
      className={`flex items-center gap-1 px-1.5 py-0.5 text-[12px] rounded transition-colors
        ${copied
          ? "text-green-500 bg-green-500/10"
          : "text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-hover)]"
        }`}
      title={copied ? "Copied!" : "Copy browsing context for AI"}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a4 4 0 0 0-4 4v1H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      )}
    </button>
  );
}
