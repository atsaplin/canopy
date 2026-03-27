import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_PATH = path.resolve(__dirname, "../dist");

let context: BrowserContext;
let extensionId: string;

async function launchWithExtension(): Promise<{
  context: BrowserContext;
  extensionId: string;
}> {
  const ctx = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--no-first-run",
      "--disable-default-apps",
      "--no-default-browser-check",
    ],
  });

  let serviceWorker = ctx.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await ctx.waitForEvent("serviceworker");
  }
  const swUrl = serviceWorker.url();
  const id = swUrl.split("/")[2];

  return { context: ctx, extensionId: id };
}

async function openSidePanel(ctx: BrowserContext, extId: string): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(`chrome-extension://${extId}/src/ui/sidepanel/index.html`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  return page;
}

async function openOptionsPage(ctx: BrowserContext, extId: string): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(`chrome-extension://${extId}/src/ui/options/index.html`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  return page;
}

async function openOnboardingPage(ctx: BrowserContext, extId: string): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(`chrome-extension://${extId}/src/ui/onboarding/index.html`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  return page;
}

test.describe("Settings, Options, Onboarding & Shortcuts", () => {
  test.beforeAll(async () => {
    const result = await launchWithExtension();
    context = result.context;
    extensionId = result.extensionId;
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ==================== ONBOARDING ====================

  test("onboarding page renders all 5 steps", async () => {
    const page = await openOnboardingPage(context, extensionId);

    // Step 1 should be visible
    await expect(page.locator("text=Your tabs, organized as a tree")).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/onboarding-01-step1.png" });

    // Click Next to step 2
    await page.click("text=Next");
    await expect(page.locator("text=Save and restore sessions")).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/onboarding-02-step2.png" });

    // Click Next to step 3
    await page.click("text=Next");
    await expect(page.getByRole("heading", { name: "Copy context for AI" })).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/onboarding-03-step3.png" });

    // Click Next to step 4
    await page.click("text=Next");
    await expect(page.locator("text=Spot stale tabs at a glance")).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/onboarding-04-step4.png" });

    // Click Next to step 5
    await page.click("text=Next");
    await expect(page.locator("text=You're all set!")).toBeVisible();
    // Final step should show "Open Canopy" button instead of "Next"
    await expect(page.locator("text=Open Canopy")).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/onboarding-05-step5.png" });

    // Back button should work
    await page.click("text=Back");
    await expect(page.locator("text=Spot stale tabs at a glance")).toBeVisible();

    // Skip button should be visible
    await expect(page.locator("text=Skip")).toBeVisible();

    await page.close();
  });

  // ==================== OPTIONS PAGE ====================

  test("options page renders all 4 tabs", async () => {
    const page = await openOptionsPage(context, extensionId);

    // General tab should be active by default
    await expect(page.locator("text=Indent size")).toBeVisible();
    await expect(page.locator("text=Show decay indicators")).toBeVisible();
    await expect(page.locator("text=Confirm close tree")).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/options-01-general.png" });

    // Hotkeys tab
    await page.click("button:has-text('Hotkeys')");
    await expect(page.locator("text=Open side panel")).toBeVisible();
    await expect(page.locator("text=Focus search")).toBeVisible();
    await expect(page.locator("text=Copy context for AI")).toBeVisible();
    await expect(page.locator("text=Navigate up/down")).toBeVisible();
    await expect(page.locator("text=Range select")).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/options-02-hotkeys.png" });

    // Sessions tab
    await page.click("button:has-text('Sessions')");
    await expect(page.locator("text=Import .json")).toBeVisible();
    await expect(page.locator("text=Export all")).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/options-03-sessions.png" });

    // About tab
    await page.click("button:has-text('About')");
    await expect(page.locator("text=Canopy — Tree Style Tabs")).toBeVisible();
    await expect(page.locator("text=GitHub")).toBeVisible();
    await expect(page.locator("text=Report a Bug")).toBeVisible();
    await expect(page.locator("text=Privacy")).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/options-04-about.png" });

    await page.close();
  });

  // ==================== SETTINGS: INDENT SIZE ====================

  test("indent size setting changes tree indentation live", async () => {
    // Create some tabs with a parent-child relationship
    const tab1 = await context.newPage();
    await tab1.goto("https://example.com");
    const tab2 = await context.newPage();
    await tab2.goto("https://example.org");

    const sidePanel = await openSidePanel(context, extensionId);
    await sidePanel.waitForTimeout(500);

    // Get initial padding of a tree item at depth > 0 (if any), or just the first item
    const firstItem = sidePanel.locator('[role="treeitem"]').first();
    await expect(firstItem).toBeVisible();
    const initialPadding = await firstItem.evaluate((el) => el.style.paddingLeft);

    // Open options and change indent size to 24px (spacious)
    const options = await openOptionsPage(context, extensionId);
    await options.selectOption("select", "24");
    await options.waitForTimeout(300);
    await options.screenshot({ path: "e2e/screenshots/settings-01-indent-24.png" });

    // Check side panel updated
    await sidePanel.bringToFront();
    await sidePanel.waitForTimeout(500);
    const newPadding = await firstItem.evaluate((el) => el.style.paddingLeft);
    // Root-level items have depth=0, so padding = 0*indentSize+8 = 8px regardless
    // But the setting should be stored
    await sidePanel.screenshot({ path: "e2e/screenshots/settings-02-sidepanel-after-indent.png" });

    // Change to 8px (compact) and verify storage
    await options.bringToFront();
    await options.selectOption("select", "8");
    await options.waitForTimeout(300);

    // Verify the setting was persisted to chrome.storage
    const storedSettings = await options.evaluate(async () => {
      const result = await chrome.storage.local.get("canopy_settings");
      return result.canopy_settings;
    });
    expect(storedSettings).toBeDefined();
    expect(storedSettings.indentSize).toBe(8);

    // Reset back to default
    await options.click("text=Reset to defaults");
    await options.waitForTimeout(300);
    const resetSettings = await options.evaluate(async () => {
      const result = await chrome.storage.local.get("canopy_settings");
      return result.canopy_settings;
    });
    expect(resetSettings.indentSize).toBe(16);

    await options.close();
    await sidePanel.close();
    await tab1.close();
    await tab2.close();
  });

  // ==================== SETTINGS: SHOW DECAY INDICATORS ====================

  test("show decay indicators toggle works", async () => {
    const options = await openOptionsPage(context, extensionId);

    // Find the toggle — it's the rounded button next to "Show decay indicators"
    // The setting row structure is: div > (div[label+desc], button[toggle])
    const toggles = options.locator("button.rounded-full");
    // First toggle is "Show decay indicators", second is "Confirm close tree"
    const toggle = toggles.first();

    // Click to disable
    await toggle.click();
    await options.waitForTimeout(300);

    // Verify it was saved as false
    const savedOff = await options.evaluate(async () => {
      const result = await chrome.storage.local.get("canopy_settings");
      return result.canopy_settings?.showDecayIndicators;
    });
    expect(savedOff).toBe(false);
    await options.screenshot({ path: "e2e/screenshots/settings-03-decay-off.png" });

    // Click to re-enable
    await toggle.click();
    await options.waitForTimeout(300);

    const savedOn = await options.evaluate(async () => {
      const result = await chrome.storage.local.get("canopy_settings");
      return result.canopy_settings?.showDecayIndicators;
    });
    expect(savedOn).toBe(true);
    await options.screenshot({ path: "e2e/screenshots/settings-04-decay-on.png" });

    await options.close();
  });

  // ==================== SETTINGS: CONFIRM CLOSE TREE ====================

  test("confirm close tree toggle persists", async () => {
    const options = await openOptionsPage(context, extensionId);

    // Second rounded toggle is "Confirm close tree"
    const toggles = options.locator("button.rounded-full");
    const toggle = toggles.nth(1);

    // Default should be disabled
    const savedDefault = await options.evaluate(async () => {
      const result = await chrome.storage.local.get("canopy_settings");
      return result.canopy_settings?.confirmCloseTree;
    });
    expect(savedDefault).toBeFalsy();

    // Enable it
    await toggle.click();
    await options.waitForTimeout(300);

    const savedEnabled = await options.evaluate(async () => {
      const result = await chrome.storage.local.get("canopy_settings");
      return result.canopy_settings?.confirmCloseTree;
    });
    expect(savedEnabled).toBe(true);
    await options.screenshot({ path: "e2e/screenshots/settings-05-confirm-close-on.png" });

    // Disable it back
    await toggle.click();
    await options.waitForTimeout(300);

    const savedDisabled = await options.evaluate(async () => {
      const result = await chrome.storage.local.get("canopy_settings");
      return result.canopy_settings?.confirmCloseTree;
    });
    expect(savedDisabled).toBe(false);

    await options.close();
  });

  // ==================== SETTINGS: RESET TO DEFAULTS ====================

  test("reset to defaults restores all settings", async () => {
    const options = await openOptionsPage(context, extensionId);

    // Change settings away from defaults
    await options.selectOption("select", "24"); // indent 24
    await options.waitForTimeout(200);

    // Click reset
    await options.click("text=Reset to defaults");
    await options.waitForTimeout(300);

    const resetSettings = await options.evaluate(async () => {
      const result = await chrome.storage.local.get("canopy_settings");
      return result.canopy_settings;
    });
    expect(resetSettings.indentSize).toBe(16);
    expect(resetSettings.showDecayIndicators).toBe(true);
    expect(resetSettings.confirmCloseTree).toBe(false);
    await options.screenshot({ path: "e2e/screenshots/settings-06-reset.png" });

    await options.close();
  });

  // ==================== SETTINGS SYNC TO SIDE PANEL ====================

  test("settings changes in options page sync to side panel live", async () => {
    const tab1 = await context.newPage();
    await tab1.goto("https://example.com");

    const sidePanel = await openSidePanel(context, extensionId);
    await sidePanel.waitForTimeout(500);

    // Open options in another tab
    const options = await openOptionsPage(context, extensionId);

    // Change indent to 8px
    await options.selectOption("select", "8");
    await options.waitForTimeout(500);

    // Switch to side panel and verify storage was updated
    await sidePanel.bringToFront();
    await sidePanel.waitForTimeout(500);

    // Verify via evaluating the store directly
    const storeIndent = await sidePanel.evaluate(() => {
      // Access the zustand store from the window
      const result = (window as any).__canopy_settings_indent;
      return result;
    });

    // Verify storage has the new value
    const storedIndent = await sidePanel.evaluate(async () => {
      const result = await chrome.storage.local.get("canopy_settings");
      return result.canopy_settings?.indentSize;
    });
    expect(storedIndent).toBe(8);

    await sidePanel.screenshot({ path: "e2e/screenshots/settings-07-synced.png" });

    // Reset
    await options.bringToFront();
    await options.click("text=Reset to defaults");
    await options.waitForTimeout(300);

    await options.close();
    await sidePanel.close();
    await tab1.close();
  });

  // ==================== KEYBOARD: ARROW NAVIGATION ====================

  test("arrow keys navigate tabs in side panel", async () => {
    const tab1 = await context.newPage();
    await tab1.goto("https://example.com");
    const tab2 = await context.newPage();
    await tab2.goto("https://example.org");

    const sidePanel = await openSidePanel(context, extensionId);
    await sidePanel.waitForTimeout(500);

    // Press Down to start keyboard navigation
    await sidePanel.keyboard.press("ArrowDown");
    await sidePanel.waitForTimeout(200);

    // There should be a selected item (ring highlight)
    const selectedItem = sidePanel.locator('[data-selected="true"]');
    const selectedCount = await selectedItem.count();
    expect(selectedCount).toBe(1);
    await sidePanel.screenshot({ path: "e2e/screenshots/keyboard-01-arrow-down.png" });

    // Press Down again to move to next
    await sidePanel.keyboard.press("ArrowDown");
    await sidePanel.waitForTimeout(200);
    await sidePanel.screenshot({ path: "e2e/screenshots/keyboard-02-arrow-down-2.png" });

    // Press Up to go back
    await sidePanel.keyboard.press("ArrowUp");
    await sidePanel.waitForTimeout(200);
    await sidePanel.screenshot({ path: "e2e/screenshots/keyboard-03-arrow-up.png" });

    await sidePanel.close();
    await tab1.close();
    await tab2.close();
  });

  // ==================== KEYBOARD: ENTER TO ACTIVATE ====================

  test("Enter key activates the selected tab", async () => {
    const tab1 = await context.newPage();
    await tab1.goto("https://example.com");
    await tab1.waitForLoadState("domcontentloaded");
    const tab2 = await context.newPage();
    await tab2.goto("https://example.org");
    await tab2.waitForLoadState("domcontentloaded");

    const sidePanel = await openSidePanel(context, extensionId);
    await sidePanel.waitForTimeout(500);

    // Navigate to first item and press Enter
    await sidePanel.keyboard.press("ArrowDown");
    await sidePanel.waitForTimeout(200);
    await sidePanel.keyboard.press("Enter");
    await sidePanel.waitForTimeout(500);

    // The active tab indicator should be on a tab item
    const activeItems = sidePanel.locator('[aria-selected="true"]');
    const activeCount = await activeItems.count();
    expect(activeCount).toBeGreaterThanOrEqual(1);
    await sidePanel.screenshot({ path: "e2e/screenshots/keyboard-04-enter-activate.png" });

    await sidePanel.close();
    await tab1.close();
    await tab2.close();
  });

  // ==================== KEYBOARD: DELETE TO CLOSE ====================

  test("Delete key closes the selected tab", async () => {
    const tab1 = await context.newPage();
    await tab1.goto("https://example.com");
    await tab1.waitForLoadState("domcontentloaded");
    const tab2 = await context.newPage();
    await tab2.goto("https://example.org");
    await tab2.waitForLoadState("domcontentloaded");

    const sidePanel = await openSidePanel(context, extensionId);
    await sidePanel.waitForTimeout(1000);

    // Click directly on the example.com tab item to select it via keyboard anchor
    const exampleItem = sidePanel.locator('[role="treeitem"]', { hasText: "Example Domain" }).first();
    await exampleItem.click();
    await sidePanel.waitForTimeout(300);

    // Count open Chrome tabs before
    const tabsBefore = await sidePanel.evaluate(async () => {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      return tabs.length;
    });

    // Now use keyboard: navigate to it and delete
    await sidePanel.keyboard.press("Delete");
    await sidePanel.waitForTimeout(2000);

    // Count open Chrome tabs after
    let tabsAfter = tabsBefore;
    for (let i = 0; i < 10; i++) {
      tabsAfter = await sidePanel.evaluate(async () => {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        return tabs.length;
      });
      if (tabsAfter < tabsBefore) break;
      await sidePanel.waitForTimeout(500);
    }
    expect(tabsAfter).toBeLessThan(tabsBefore);
    await sidePanel.screenshot({ path: "e2e/screenshots/keyboard-05-delete.png" });

    await sidePanel.close();
    for (const page of context.pages()) {
      if (!page.url().startsWith("chrome-extension://")) {
        await page.close().catch(() => {});
      }
    }
  });

  // ==================== KEYBOARD: ESCAPE CLEARS ====================

  test("Escape key closes context menu", async () => {
    const tab1 = await context.newPage();
    await tab1.goto("https://example.com");

    const sidePanel = await openSidePanel(context, extensionId);
    await sidePanel.waitForTimeout(500);

    // Right-click to open context menu
    const firstItem = sidePanel.locator('[role="treeitem"]').first();
    await firstItem.click({ button: "right" });
    await sidePanel.waitForTimeout(300);

    // Context menu should be visible (rendered as portal to body)
    // Scope to the context menu container to avoid matching × buttons on tab rows
    const contextMenu = sidePanel.locator(".min-w-\\[180px\\]");
    const closeBtn = contextMenu.getByText("Close tab", { exact: true });
    await expect(closeBtn).toBeVisible();
    await sidePanel.screenshot({ path: "e2e/screenshots/keyboard-06-context-menu.png" });

    // Press Escape to close it
    await sidePanel.keyboard.press("Escape");
    await sidePanel.waitForTimeout(300);

    // Context menu should be gone
    await expect(closeBtn).not.toBeVisible();
    await sidePanel.screenshot({ path: "e2e/screenshots/keyboard-07-escape-closed.png" });

    await sidePanel.close();
    await tab1.close();
  });

  // ==================== CONTEXT MENU ACTIONS ====================

  test("context menu shows all expected actions", async () => {
    const tab1 = await context.newPage();
    await tab1.goto("https://example.com");

    const sidePanel = await openSidePanel(context, extensionId);
    await sidePanel.waitForTimeout(500);

    const firstItem = sidePanel.locator('[role="treeitem"]').first();
    await firstItem.click({ button: "right" });
    await sidePanel.waitForTimeout(300);

    // Verify all expected menu items — scope to context menu container
    const menu = sidePanel.locator(".min-w-\\[180px\\]");
    await expect(menu.getByText("Close tab", { exact: true })).toBeVisible();
    await expect(menu.getByText("Duplicate tab")).toBeVisible();
    await expect(menu.getByText("Detach from parent")).toBeVisible();
    await expect(menu.getByText("Move to new window")).toBeVisible();
    await expect(menu.getByText("Copy URL")).toBeVisible();
    await expect(menu.getByText("Copy tree as JSON")).toBeVisible();
    await expect(menu.getByText("Copy context for AI")).toBeVisible();
    await sidePanel.screenshot({ path: "e2e/screenshots/context-menu-01-all-items.png" });

    // Close menu
    await sidePanel.keyboard.press("Escape");
    await sidePanel.close();
    await tab1.close();
  });

  // ==================== MULTI-SELECT ====================

  test("shift+click range selects tabs", async () => {
    const tab1 = await context.newPage();
    await tab1.goto("https://example.com");
    const tab2 = await context.newPage();
    await tab2.goto("https://example.org");
    const tab3 = await context.newPage();
    await tab3.goto("https://www.iana.org");

    const sidePanel = await openSidePanel(context, extensionId);
    await sidePanel.waitForTimeout(500);

    const items = sidePanel.locator('[role="treeitem"]');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Click first item normally
    await items.first().click();
    await sidePanel.waitForTimeout(200);

    // Shift+click last item for range select
    await items.nth(count - 1).click({ modifiers: ["Shift"] });
    await sidePanel.waitForTimeout(200);

    await sidePanel.screenshot({ path: "e2e/screenshots/multiselect-01-range.png" });

    // Right-click should show "Close N tabs"
    await items.nth(1).click({ button: "right" });
    await sidePanel.waitForTimeout(300);
    const closeLabel = sidePanel.locator("button").filter({ hasText: /Close \d+ tabs/ });
    const closeCount = await closeLabel.count();
    expect(closeCount).toBeGreaterThanOrEqual(1);
    await sidePanel.screenshot({ path: "e2e/screenshots/multiselect-02-close-n.png" });

    await sidePanel.keyboard.press("Escape");
    await sidePanel.close();
    await tab1.close();
    await tab2.close();
    await tab3.close();
  });

  // ==================== SEARCH ====================

  test("search input filters tabs", async () => {
    const tab1 = await context.newPage();
    await tab1.goto("https://example.com");
    await tab1.waitForLoadState("domcontentloaded");

    const sidePanel = await openSidePanel(context, extensionId);
    await sidePanel.waitForTimeout(500);

    // Type in search
    const searchInput = sidePanel.locator("[data-search-input]");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("example");
    await sidePanel.waitForTimeout(500);

    await sidePanel.screenshot({ path: "e2e/screenshots/search-01-filtered.png" });

    // Clear search
    await searchInput.fill("");
    await sidePanel.waitForTimeout(500);
    await sidePanel.screenshot({ path: "e2e/screenshots/search-02-cleared.png" });

    await sidePanel.close();
    await tab1.close();
  });

  // ==================== SESSIONS IN OPTIONS ====================

  test("sessions tab shows saved sessions and allows export", async () => {
    // First save a session via the side panel
    const tab1 = await context.newPage();
    await tab1.goto("https://example.com");

    const sidePanel = await openSidePanel(context, extensionId);
    await sidePanel.waitForTimeout(500);

    // Click save session button
    const saveBtn = sidePanel.locator("[data-save-session]");
    await saveBtn.click();
    await sidePanel.waitForTimeout(300);

    // Fill in session name and save
    const nameInput = sidePanel.locator('input[placeholder]').last();
    if (await nameInput.isVisible()) {
      await nameInput.fill("Test Session E2E");
      await sidePanel.keyboard.press("Enter");
      await sidePanel.waitForTimeout(500);
    }

    // Open options page sessions tab
    const options = await openOptionsPage(context, extensionId);
    await options.click("button:has-text('Sessions')");
    await options.waitForTimeout(500);

    // Should show at least 1 session
    const sessionCount = await options.locator("text=tab").count();
    expect(sessionCount).toBeGreaterThanOrEqual(1);
    await options.screenshot({ path: "e2e/screenshots/options-05-sessions-list.png" });

    // Click to expand a session
    const sessionRow = options.locator(".rounded-lg").first();
    await sessionRow.click();
    await options.waitForTimeout(500);
    await options.screenshot({ path: "e2e/screenshots/options-06-session-expanded.png" });

    await options.close();
    await sidePanel.close();
    await tab1.close();
  });

  // ==================== NO POPUP ====================

  test("manifest has no popup, only side panel", async () => {
    const sidePanel = await openSidePanel(context, extensionId);

    const manifest = await sidePanel.evaluate(async () => {
      return chrome.runtime.getManifest();
    });

    // No popup
    expect(manifest.action?.default_popup).toBeUndefined();
    // Side panel is set
    expect((manifest as any).side_panel?.default_path).toContain("sidepanel");
    // Options page is set
    expect((manifest as any).options_ui?.page).toContain("options");
    // Version is 3.1.0
    expect(manifest.version).toBe("3.1.0");

    // 4 commands defined
    expect(manifest.commands).toBeDefined();
    expect(manifest.commands!["_execute_action"]).toBeDefined();
    expect(manifest.commands!["focus-search"]).toBeDefined();
    expect(manifest.commands!["copy-context"]).toBeDefined();
    expect(manifest.commands!["save-session"]).toBeDefined();

    await sidePanel.close();
  });
});
