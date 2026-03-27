/** Decay levels for tab activity. */
export type DecayLevel = "fresh" | "warm" | "stale" | "decayed";

/** Tab activity record. */
export interface TabActivity {
  tabId: number;
  lastAccessed: number; // timestamp ms
}

/** Stale tab with its decay level. */
export interface StaleTab {
  tabId: number;
  lastAccessed: number;
  level: DecayLevel;
}

/** Thresholds in hours for each decay level. */
export const DECAY_THRESHOLDS = {
  warm: 6,      // 6 hours
  stale: 24,    // 1 day
  decayed: 72,  // 3 days
} as const;

/**
 * Get the decay level of a tab based on when it was last accessed.
 * Pure function — no side effects.
 */
export function getDecayLevel(lastAccessed: number, now: number): DecayLevel {
  const hoursAgo = (now - lastAccessed) / 3600_000;

  if (hoursAgo < DECAY_THRESHOLDS.warm) return "fresh";
  if (hoursAgo < DECAY_THRESHOLDS.stale) return "warm";
  if (hoursAgo < DECAY_THRESHOLDS.decayed) return "stale";
  return "decayed";
}

/**
 * Get all tabs that are stale or decayed.
 * Returns them sorted by staleness (most decayed first).
 */
export function getStaleTabs(
  activities: TabActivity[],
  now: number,
): StaleTab[] {
  const stale: StaleTab[] = [];

  for (const activity of activities) {
    const level = getDecayLevel(activity.lastAccessed, now);
    if (level === "stale" || level === "decayed") {
      stale.push({
        tabId: activity.tabId,
        lastAccessed: activity.lastAccessed,
        level,
      });
    }
  }

  return stale.sort((a, b) => a.lastAccessed - b.lastAccessed);
}
