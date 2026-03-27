/**
 * Typed wrapper for chrome.tabGroups API.
 * Handles the case where chrome.tabGroups is unavailable
 * (older Chrome versions or Chromium forks).
 */

export function isTabGroupsAvailable(): boolean {
  return typeof chrome !== "undefined" && !!chrome.tabGroups;
}

export async function queryTabGroups(
  queryInfo?: chrome.tabGroups.QueryInfo,
): Promise<chrome.tabGroups.TabGroup[]> {
  if (!isTabGroupsAvailable()) {
    return [];
  }
  return chrome.tabGroups.query(queryInfo ?? {});
}

export async function getTabGroup(
  groupId: number,
): Promise<chrome.tabGroups.TabGroup | undefined> {
  if (!isTabGroupsAvailable()) {
    return undefined;
  }
  try {
    return await chrome.tabGroups.get(groupId);
  } catch {
    return undefined;
  }
}

export async function updateTabGroup(
  groupId: number,
  updateProperties: chrome.tabGroups.UpdateProperties,
): Promise<chrome.tabGroups.TabGroup | undefined> {
  if (!isTabGroupsAvailable()) {
    return undefined;
  }
  return chrome.tabGroups.update(groupId, updateProperties);
}
