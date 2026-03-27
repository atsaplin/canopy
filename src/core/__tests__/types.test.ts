import { describe, it, expect } from "vitest";
import { isTab, isTabGroup } from "@core/types";

describe("isTab", () => {
  it("returns true for a valid Tab", () => {
    expect(
      isTab({ id: 1, title: "Test", url: "https://example.com", active: false, index: 0 }),
    ).toBe(true);
  });

  it("returns true for a Tab with optional fields", () => {
    expect(
      isTab({
        id: 1,
        title: "Test",
        url: "https://example.com",
        active: true,
        index: 0,
        favIconUrl: "https://example.com/icon.png",
        groupId: 5,
        openerTabId: 2,
        status: "complete",
      }),
    ).toBe(true);
  });

  it("returns false for null", () => {
    expect(isTab(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isTab(undefined)).toBe(false);
  });

  it("returns false when missing required fields", () => {
    expect(isTab({ id: 1, title: "Test" })).toBe(false);
  });

  it("returns false when id is a string", () => {
    expect(
      isTab({ id: "1", title: "Test", url: "https://example.com", active: false, index: 0 }),
    ).toBe(false);
  });
});

describe("isTabGroup", () => {
  it("returns true for a valid TabGroup", () => {
    expect(isTabGroup({ id: 1, color: "blue", collapsed: false })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isTabGroup(null)).toBe(false);
  });

  it("returns false when missing required fields", () => {
    expect(isTabGroup({ id: 1 })).toBe(false);
  });
});
