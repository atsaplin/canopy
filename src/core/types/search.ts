import type { Tab } from "./tab";

/** A range within a string where a search match was found. */
export interface HighlightRange {
  start: number;
  end: number;
}

/** A search result for a tab/bookmark. */
export interface SearchResult {
  tab: Tab;
  /** Match ranges in the title. */
  titleHighlights: HighlightRange[];
  /** Match ranges in the URL. */
  urlHighlights: HighlightRange[];
  /** Relevance score (higher = better match). */
  score: number;
}
