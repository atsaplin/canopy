import { describe, it, expect } from "vitest";
import { isSessionData, isSessionNode } from "@core/types";
import type { SessionData } from "@core/types";

describe("isSessionNode", () => {
  it("accepts a valid leaf node", () => {
    expect(isSessionNode({ url: "https://example.com", title: "Example", nodes: [] })).toBe(true);
  });

  it("accepts a node with group info", () => {
    expect(
      isSessionNode({
        url: "https://example.com",
        title: "Example",
        group: { name: "Work", color: "blue" },
        nodes: [],
      }),
    ).toBe(true);
  });

  it("accepts a node with nested children", () => {
    expect(
      isSessionNode({
        url: "https://parent.com",
        title: "Parent",
        nodes: [{ url: "https://child.com", title: "Child", nodes: [] }],
      }),
    ).toBe(true);
  });

  it("rejects null", () => {
    expect(isSessionNode(null)).toBe(false);
  });

  it("rejects missing url", () => {
    expect(isSessionNode({ title: "No URL", nodes: [] })).toBe(false);
  });

  it("rejects missing nodes array", () => {
    expect(isSessionNode({ url: "https://example.com", title: "Example" })).toBe(false);
  });

  it("rejects invalid nested child", () => {
    expect(
      isSessionNode({
        url: "https://parent.com",
        title: "Parent",
        nodes: [{ broken: true }],
      }),
    ).toBe(false);
  });
});

describe("isSessionData", () => {
  it("accepts a valid session with empty nodes", () => {
    expect(
      isSessionData({ name: "Test", savedAt: "2026-01-01T00:00:00Z", version: 1, nodes: [] }),
    ).toBe(true);
  });

  it("accepts a valid session with nodes", () => {
    const session: SessionData = {
      name: "Research",
      savedAt: "2026-03-26T12:00:00Z",
      version: 1,
      nodes: [
        {
          url: "https://example.com",
          title: "Example",
          nodes: [{ url: "https://child.com", title: "Child", nodes: [] }],
        },
      ],
    };
    expect(isSessionData(session)).toBe(true);
  });

  it("rejects missing name", () => {
    expect(isSessionData({ savedAt: "2026-01-01", version: 1, nodes: [] })).toBe(false);
  });

  it("rejects missing savedAt", () => {
    expect(isSessionData({ name: "Test", version: 1, nodes: [] })).toBe(false);
  });

  it("rejects missing version", () => {
    expect(isSessionData({ name: "Test", savedAt: "2026-01-01", nodes: [] })).toBe(false);
  });

  it("rejects missing nodes", () => {
    expect(isSessionData({ name: "Test", savedAt: "2026-01-01", version: 1 })).toBe(false);
  });

  it("rejects invalid nodes", () => {
    expect(
      isSessionData({ name: "Test", savedAt: "2026-01-01", version: 1, nodes: [{ broken: true }] }),
    ).toBe(false);
  });

  it("rejects non-object", () => {
    expect(isSessionData("not an object")).toBe(false);
  });
});
