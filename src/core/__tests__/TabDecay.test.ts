import { describe, it, expect } from "vitest";
import {
  getDecayLevel,
  getStaleTabs,
  type TabActivity,
  DECAY_THRESHOLDS,
} from "@core/TabDecay";

const now = Date.now();
const hours = (h: number) => now - h * 3600_000;
const days = (d: number) => now - d * 86400_000;

describe("getDecayLevel", () => {
  it("returns 'fresh' for recently accessed tab", () => {
    expect(getDecayLevel(hours(1), now)).toBe("fresh");
  });

  it("returns 'warm' for tab accessed 6-24 hours ago", () => {
    expect(getDecayLevel(hours(8), now)).toBe("warm");
  });

  it("returns 'stale' for tab accessed 1-3 days ago", () => {
    expect(getDecayLevel(days(2), now)).toBe("stale");
  });

  it("returns 'decayed' for tab accessed 3+ days ago", () => {
    expect(getDecayLevel(days(5), now)).toBe("decayed");
  });

  it("returns 'fresh' for tab with no last access (just created)", () => {
    expect(getDecayLevel(now, now)).toBe("fresh");
  });
});

describe("getStaleTabs", () => {
  it("returns tabs that are stale or decayed", () => {
    const activities: TabActivity[] = [
      { tabId: 1, lastAccessed: hours(1) },
      { tabId: 2, lastAccessed: days(2) },
      { tabId: 3, lastAccessed: days(5) },
      { tabId: 4, lastAccessed: hours(12) },
    ];
    const stale = getStaleTabs(activities, now);
    expect(stale.map((s) => s.tabId).sort()).toEqual([2, 3]);
  });

  it("returns empty array when all tabs are fresh", () => {
    const activities: TabActivity[] = [
      { tabId: 1, lastAccessed: hours(1) },
      { tabId: 2, lastAccessed: hours(2) },
    ];
    expect(getStaleTabs(activities, now)).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(getStaleTabs([], now)).toEqual([]);
  });

  it("includes decay level in results", () => {
    const activities: TabActivity[] = [
      { tabId: 1, lastAccessed: days(2) },
      { tabId: 2, lastAccessed: days(5) },
    ];
    const stale = getStaleTabs(activities, now);
    const tab1 = stale.find((s) => s.tabId === 1);
    const tab2 = stale.find((s) => s.tabId === 2);
    expect(tab1?.level).toBe("stale");
    expect(tab2?.level).toBe("decayed");
  });
});

describe("DECAY_THRESHOLDS", () => {
  it("has correct hour values", () => {
    expect(DECAY_THRESHOLDS.warm).toBe(6);
    expect(DECAY_THRESHOLDS.stale).toBe(24);
    expect(DECAY_THRESHOLDS.decayed).toBe(72);
  });
});
