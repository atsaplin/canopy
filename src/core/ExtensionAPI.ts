/**
 * Canopy Extension API
 *
 * Other extensions can communicate with Canopy by sending messages
 * via chrome.runtime.sendMessage(CANOPY_EXTENSION_ID, message).
 *
 * All messages must have a `type` field prefixed with "canopy:".
 *
 * This module defines the message types and type guards.
 * The actual handlers are in the service worker.
 */

/** All valid Canopy API message types. */
export const CANOPY_API_MESSAGES = [
  // Tree queries
  "canopy:get-tree",        // Get the full tab tree
  "canopy:get-tab",         // Get a specific tab by ID
  "canopy:get-children",    // Get children of a tab
  "canopy:get-parent",      // Get parent of a tab

  // Tree operations
  "canopy:collapse-tree",   // Collapse a tree node
  "canopy:expand-tree",     // Expand a tree node
  "canopy:attach-tab",      // Attach a tab as child of another
  "canopy:detach-tab",      // Detach a tab from its parent
  "canopy:move-tab",        // Move tab up/down in tree

  // Context
  "canopy:dump-context",    // Get browsing context as markdown

  // Meta
  "canopy:get-version",     // Get Canopy version
  "canopy:ping",            // Health check
] as const;

export type CanopyAPIMessageType = (typeof CANOPY_API_MESSAGES)[number];

/** A message sent to Canopy's API by another extension. */
export type CanopyAPIMessage =
  | { type: "canopy:get-tree" }
  | { type: "canopy:get-tab"; tabId: number }
  | { type: "canopy:get-children"; tabId: number }
  | { type: "canopy:get-parent"; tabId: number }
  | { type: "canopy:collapse-tree"; tabId: number }
  | { type: "canopy:expand-tree"; tabId: number }
  | { type: "canopy:attach-tab"; tabId: number; parentId: number }
  | { type: "canopy:detach-tab"; tabId: number }
  | { type: "canopy:move-tab"; tabId: number; direction: "up" | "down" }
  | { type: "canopy:dump-context"; options?: { includeUrls?: boolean; maxDepth?: number } }
  | { type: "canopy:get-version" }
  | { type: "canopy:ping" };

/** Type guard for Canopy API messages. */
export function isCanopyAPIMessage(value: unknown): value is CanopyAPIMessage {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.type !== "string") return false;
  if (!obj.type.startsWith("canopy:")) return false;
  return (CANOPY_API_MESSAGES as readonly string[]).includes(obj.type);
}
