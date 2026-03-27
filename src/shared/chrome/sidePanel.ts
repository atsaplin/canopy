/**
 * Typed wrapper for chrome.sidePanel API.
 * Handles the case where chrome.sidePanel is unavailable.
 */

export function isSidePanelAvailable(): boolean {
  return typeof chrome !== "undefined" && !!chrome.sidePanel;
}

export async function openSidePanel(windowId: number): Promise<void> {
  if (!isSidePanelAvailable()) {
    return;
  }
  await chrome.sidePanel.open({ windowId });
}
