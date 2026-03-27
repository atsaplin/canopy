import { describe, it, expect } from "vitest";
import {
  setParent,
  removeParent,
  getChildren,
  getAncestors,
  serializeParentMap,
  deserializeParentMap,
} from "@core/ParentMap";
import type { ParentMap } from "@core/types";

describe("setParent", () => {
  it("adds a parent-child relationship", () => {
    const map: ParentMap = {};
    const result = setParent(map, 2, 1);
    expect(result[2]).toBe(1);
    // Original unchanged
    expect(map[2]).toBeUndefined();
  });

  it("overwrites an existing parent", () => {
    const map: ParentMap = { 2: 1 };
    const result = setParent(map, 2, 3);
    expect(result[2]).toBe(3);
  });
});

describe("removeParent", () => {
  it("removes a parent-child relationship", () => {
    const map: ParentMap = { 2: 1, 3: 1 };
    const result = removeParent(map, 2);
    expect(result[2]).toBeUndefined();
    expect(result[3]).toBe(1);
  });

  it("returns unchanged map when key not found", () => {
    const map: ParentMap = { 2: 1 };
    const result = removeParent(map, 999);
    expect(result).toEqual(map);
  });
});

describe("getChildren", () => {
  it("returns child IDs for a parent", () => {
    const map: ParentMap = { 2: 1, 3: 1, 4: 2 };
    expect(getChildren(map, 1).sort()).toEqual([2, 3]);
  });

  it("returns empty array when no children", () => {
    expect(getChildren({}, 1)).toEqual([]);
  });
});

describe("getAncestors", () => {
  it("returns ancestor chain", () => {
    const map: ParentMap = { 3: 2, 2: 1 };
    expect(getAncestors(map, 3)).toEqual([2, 1]);
  });

  it("returns empty array for root tab", () => {
    expect(getAncestors({}, 1)).toEqual([]);
  });

  it("detects cycles and stops", () => {
    const map: ParentMap = { 1: 2, 2: 1 };
    const ancestors = getAncestors(map, 1);
    // Should not infinite loop, should return partial chain
    expect(ancestors).toEqual([2]);
  });
});

describe("serialize/deserialize", () => {
  it("round-trips a parent map", () => {
    const map: ParentMap = { 2: 1, 3: 1, 4: 2 };
    const serialized = serializeParentMap(map);
    const deserialized = deserializeParentMap(serialized);
    expect(deserialized).toEqual(map);
  });

  it("handles empty map", () => {
    const serialized = serializeParentMap({});
    expect(deserializeParentMap(serialized)).toEqual({});
  });
});
