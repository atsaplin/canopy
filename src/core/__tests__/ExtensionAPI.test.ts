import { describe, it, expect } from "vitest";
import {
  isCanopyAPIMessage,
  CANOPY_API_MESSAGES,
} from "@core/ExtensionAPI";

describe("isCanopyAPIMessage", () => {
  it("accepts a valid get-tree message", () => {
    expect(isCanopyAPIMessage({ type: "canopy:get-tree" })).toBe(true);
  });

  it("accepts a valid collapse message with params", () => {
    expect(
      isCanopyAPIMessage({ type: "canopy:collapse-tree", tabId: 42 }),
    ).toBe(true);
  });

  it("rejects messages without canopy: prefix", () => {
    expect(isCanopyAPIMessage({ type: "other-extension" })).toBe(false);
  });

  it("rejects non-object values", () => {
    expect(isCanopyAPIMessage("string")).toBe(false);
    expect(isCanopyAPIMessage(null)).toBe(false);
    expect(isCanopyAPIMessage(42)).toBe(false);
  });

  it("rejects unknown canopy message types", () => {
    expect(isCanopyAPIMessage({ type: "canopy:unknown-action" })).toBe(false);
  });
});

describe("CANOPY_API_MESSAGES", () => {
  it("contains all expected message types", () => {
    expect(CANOPY_API_MESSAGES).toContain("canopy:get-tree");
    expect(CANOPY_API_MESSAGES).toContain("canopy:get-tab");
    expect(CANOPY_API_MESSAGES).toContain("canopy:collapse-tree");
    expect(CANOPY_API_MESSAGES).toContain("canopy:expand-tree");
    expect(CANOPY_API_MESSAGES).toContain("canopy:move-tab");
    expect(CANOPY_API_MESSAGES).toContain("canopy:get-children");
    expect(CANOPY_API_MESSAGES).toContain("canopy:get-parent");
    expect(CANOPY_API_MESSAGES).toContain("canopy:attach-tab");
    expect(CANOPY_API_MESSAGES).toContain("canopy:detach-tab");
    expect(CANOPY_API_MESSAGES).toContain("canopy:get-version");
    expect(CANOPY_API_MESSAGES).toContain("canopy:dump-context");
  });
});
