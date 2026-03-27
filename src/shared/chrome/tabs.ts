/**
 * Typed wrapper for chrome.tabs API.
 */

export async function queryTabs(
  queryInfo: chrome.tabs.QueryInfo,
): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query(queryInfo);
}

export async function getCurrentWindowTabs(): Promise<chrome.tabs.Tab[]> {
  return queryTabs({ currentWindow: true });
}

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await queryTabs({ active: true, currentWindow: true });
  return tabs[0];
}

export async function moveTab(
  tabId: number,
  moveProperties: chrome.tabs.MoveProperties,
): Promise<chrome.tabs.Tab> {
  return chrome.tabs.move(tabId, moveProperties);
}

export async function closeTab(tabId: number): Promise<void> {
  return chrome.tabs.remove(tabId);
}
