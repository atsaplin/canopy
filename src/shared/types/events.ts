/** Domain events broadcast by the service worker to UI contexts. */

export type TabChangeInfo = {
  status?: string;
  url?: string;
  title?: string;
  favIconUrl?: string;
};

export type TabMoveInfo = {
  windowId: number;
  fromIndex: number;
  toIndex: number;
};

export type TabAttachInfo = {
  newWindowId: number;
  newPosition: number;
};

export type TabDetachInfo = {
  oldWindowId: number;
  oldPosition: number;
};

export type DomainEvent =
  | { type: "TAB_CREATED"; tab: chrome.tabs.Tab }
  | { type: "TAB_REMOVED"; tabId: number; windowId: number }
  | { type: "TAB_UPDATED"; tabId: number; changeInfo: TabChangeInfo; tab: chrome.tabs.Tab }
  | { type: "TAB_MOVED"; tabId: number; moveInfo: TabMoveInfo }
  | { type: "TAB_ACTIVATED"; tabId: number; windowId: number }
  | { type: "TAB_ATTACHED"; tabId: number; attachInfo: TabAttachInfo }
  | { type: "TAB_DETACHED"; tabId: number; detachInfo: TabDetachInfo }
  | { type: "GROUP_CREATED"; group: chrome.tabGroups.TabGroup }
  | { type: "GROUP_REMOVED"; groupId: number }
  | { type: "GROUP_UPDATED"; group: chrome.tabGroups.TabGroup }
  | { type: "PARENT_MAP_CHANGED"; parentMap: Record<number, number> }
  | { type: "SESSION_SAVED"; id: string; name: string }
  | { type: "SESSION_DELETED"; id: string }
  | { type: "SW_READY" };

/** Check if a message is a domain event. */
export function isDomainEvent(message: unknown): message is DomainEvent {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    typeof (message as Record<string, unknown>).type === "string"
  );
}
