import type { FlatTreeItem } from "@core/types";
import { useTabStore } from "@ui/stores/tabStore";
import { useDroppable } from "@dnd-kit/core";

const GROUP_COLORS: Record<string, string> = {
  grey: "#9ca3af",
  blue: "#3b82f6",
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
  pink: "#ec4899",
  purple: "#a855f7",
  cyan: "#06b6d4",
  orange: "#f97316",
};

interface GroupItemProps {
  item: FlatTreeItem;
}

export function GroupItem({ item }: GroupItemProps) {
  const { node, depth, isExpanded, descendantCount } = item;
  const toggleCollapse = useTabStore((s) => s.toggleCollapse);
  const group = node.group;
  if (!group) return null;

  const { setNodeRef, isOver } = useDroppable({
    id: node.id,
  });

  const paddingLeft = depth * 16 + 8;
  const color = GROUP_COLORS[group.color] ?? GROUP_COLORS.grey;

  const handleToggle = () => {
    toggleCollapse(node.id);
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-1.5 py-1 px-1 cursor-pointer hover:bg-[var(--color-hover)]
        ${isOver ? "ring-2 ring-[var(--color-accent)] ring-inset" : ""}`}
      style={{ paddingLeft }}
      onClick={handleToggle}
      role="treeitem"
      aria-level={depth + 1}
      aria-expanded={isExpanded}
      data-node-id={node.id}
    >
      {/* Color bar */}
      <div
        className="w-1 h-4 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />

      {/* Group title */}
      <span className="text-[12px] font-medium text-[var(--color-muted)] truncate flex-1">
        {group.title || "Unnamed group"}
      </span>

      {/* Tab count */}
      <span className="text-[10px] text-[var(--color-muted)] px-1">
        {descendantCount}
      </span>

      {/* Collapse indicator */}
      <span className="text-[10px] text-[var(--color-muted)]">
        {isExpanded ? "▼" : "▶"}
      </span>
    </div>
  );
}
