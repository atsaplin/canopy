/** Messages sent from UI to service worker for write operations. */

export type WriteMessage =
  | { action: "MOVE_TAB"; tabId: number; moveProperties: chrome.tabs.MoveProperties }
  | { action: "REPARENT_TAB"; tabId: number; newParentId: number | null }
  | { action: "GROUP_TABS"; tabIds: number[]; groupId?: number; title?: string; color?: string }
  | { action: "UNGROUP_TAB"; tabId: number }
  | { action: "CLOSE_TAB"; tabId: number }
  | { action: "CLOSE_TAB_TREE"; tabId: number; descendantIds: number[] }
  | { action: "SAVE_SESSION"; name: string }
  | { action: "IMPORT_SESSION"; session: import("@core/types").SessionData }
  | { action: "LIST_SESSIONS" }
  | { action: "RESTORE_SESSION"; id: string; mode: "replace" | "add" }
  | { action: "DELETE_SESSION"; id: string }
  | { action: "GET_SESSION"; id: string }
  | { action: "GET_TAB_ACTIVITY" }
  | { action: "ARCHIVE_TABS"; tabIds: number[] };

/** Response from service worker to UI. */
export type WriteResponse =
  | { success: true; data?: unknown }
  | { success: false; error: string; code: ErrorCode };

export type ErrorCode =
  | "TAB_NOT_FOUND"
  | "GROUP_NOT_FOUND"
  | "SESSION_NOT_FOUND"
  | "RESTORE_FAILED"
  | "INVALID_OPERATION"
  | "CHROME_API_ERROR"
  | "UNKNOWN_ERROR";

/** Check if a message is a write message. */
export function isWriteMessage(message: unknown): message is WriteMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "action" in message &&
    typeof (message as Record<string, unknown>).action === "string"
  );
}
