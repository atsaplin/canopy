/** Represents a Chrome tab with the fields Canopy needs. */
export interface Tab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  active: boolean;
  index: number;
  groupId?: number;
  openerTabId?: number;
  status?: "loading" | "complete" | "unloaded";
  pinned?: boolean;
  mutedInfo?: { muted: boolean };
  isBookmark?: boolean;
}

/** Represents a Chrome tab group. */
export interface TabGroup {
  id: number;
  title?: string;
  color: TabGroupColor;
  collapsed: boolean;
}

export type TabGroupColor =
  | "grey"
  | "blue"
  | "red"
  | "yellow"
  | "green"
  | "pink"
  | "purple"
  | "cyan"
  | "orange";

/** Maps child tab ID → parent tab ID. */
export type ParentMap = Record<number, number>;

/** Type guard for Tab. */
export function isTab(value: unknown): value is Tab {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "number" &&
    typeof obj.title === "string" &&
    typeof obj.url === "string" &&
    typeof obj.active === "boolean" &&
    typeof obj.index === "number"
  );
}

/** Type guard for TabGroup. */
export function isTabGroup(value: unknown): value is TabGroup {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "number" &&
    typeof obj.color === "string" &&
    typeof obj.collapsed === "boolean"
  );
}
