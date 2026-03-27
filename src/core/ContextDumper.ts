import type { TabTreeNode } from "@core/types";

/**
 * Serialize a tab tree into a structured markdown format optimized for AI context.
 * Produces human-readable text that an LLM can consume to understand the user's
 * browsing context, research trails, and active work.
 */
export function dumpContextAsMarkdown(
  tree: TabTreeNode,
  options: ContextDumpOptions = {},
): string {
  const {
    includeUrls = true,
    maxDepth = Infinity,
    title = "Browsing Context",
  } = options;

  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push(`> ${countTabs(tree)} tabs open at ${new Date().toLocaleString()}`);
  lines.push("");

  if (tree.children.length === 0) {
    lines.push("No tabs open.");
    return lines.join("\n");
  }

  for (const child of tree.children) {
    renderNode(child, 0, lines, includeUrls, maxDepth);
  }

  return lines.join("\n");
}

/**
 * Serialize specific tree nodes (e.g., selected nodes) into AI context format.
 */
export function dumpNodesAsMarkdown(
  nodes: TabTreeNode[],
  options: ContextDumpOptions = {},
): string {
  const {
    includeUrls = true,
    maxDepth = Infinity,
    title = "Selected Tabs",
  } = options;

  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push(`> ${nodes.reduce((sum, n) => sum + countTabs(n) + (n.tab ? 1 : 0), 0)} tabs`);
  lines.push("");

  for (const node of nodes) {
    renderNode(node, 0, lines, includeUrls, maxDepth);
  }

  return lines.join("\n");
}

function renderNode(
  node: TabTreeNode,
  depth: number,
  lines: string[],
  includeUrls: boolean,
  maxDepth: number,
): void {
  if (depth > maxDepth) return;

  const indent = "  ".repeat(depth);

  if (node.isGroup && node.group) {
    lines.push(`${indent}## [${node.group.color}] ${node.group.title || "Unnamed Group"}`);
    for (const child of node.children) {
      renderNode(child, depth + 1, lines, includeUrls, maxDepth);
    }
    lines.push("");
  } else if (node.tab) {
    const bullet = node.children.length > 0 ? "▸" : "•";
    lines.push(`${indent}${bullet} ${node.tab.title}`);
    if (includeUrls) {
      lines.push(`${indent}  ${node.tab.url}`);
    }
    for (const child of node.children) {
      renderNode(child, depth + 1, lines, includeUrls, maxDepth);
    }
  }
}

function countTabs(node: TabTreeNode): number {
  let count = 0;
  for (const child of node.children) {
    if (child.tab) count++;
    count += countTabs(child);
  }
  return count;
}

export interface ContextDumpOptions {
  /** Include URLs below each tab title. Default: true */
  includeUrls?: boolean;
  /** Max tree depth to include. Default: Infinity */
  maxDepth?: number;
  /** Title for the context dump. Default: "Browsing Context" */
  title?: string;
}
