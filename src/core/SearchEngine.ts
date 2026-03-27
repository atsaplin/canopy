import type { Tab, SearchResult, HighlightRange } from "@core/types";

/** Escape regex special characters. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Find all match ranges in a string. */
function findHighlights(text: string, regex: RegExp): HighlightRange[] {
  const ranges: HighlightRange[] = [];
  let match: RegExpExecArray | null;
  const r = new RegExp(regex.source, "gi");
  while ((match = r.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
    if (match[0].length === 0) break; // prevent infinite loop on zero-length match
  }
  return ranges;
}

/**
 * Filter tabs by keyword using regex-safe matching on title and URL.
 * Returns all tabs if keyword is empty.
 */
export function filterTabs(keyword: string, tabs: Tab[]): SearchResult[] {
  if (!keyword) {
    return tabs.map((tab) => ({
      tab,
      titleHighlights: [],
      urlHighlights: [],
      score: 0,
    }));
  }

  const escaped = escapeRegex(keyword);
  const regex = new RegExp(escaped, "gi");

  const results: SearchResult[] = [];
  for (const tab of tabs) {
    const titleHighlights = findHighlights(tab.title, regex);
    const urlHighlights = findHighlights(tab.url, regex);
    if (titleHighlights.length > 0 || urlHighlights.length > 0) {
      const score = titleHighlights.length * 2 + urlHighlights.length;
      results.push({ tab, titleHighlights, urlHighlights, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Fuzzy search tabs by query. Matches against title and URL.
 * Returns results sorted by relevance score.
 */
export function fuzzySearch(query: string, tabs: Tab[]): SearchResult[] {
  if (!query) return [];

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const tab of tabs) {
    const lowerTitle = tab.title.toLowerCase();
    const lowerUrl = tab.url.toLowerCase();

    let score = 0;
    const titleHighlights: HighlightRange[] = [];
    const urlHighlights: HighlightRange[] = [];

    // Exact match in title
    if (lowerTitle === lowerQuery) {
      score += 100;
    }
    // Title starts with query
    if (lowerTitle.startsWith(lowerQuery)) {
      score += 50;
    }
    // Word boundary match in title
    const words = lowerTitle.split(/\s+/);
    for (const word of words) {
      if (word.startsWith(lowerQuery)) {
        score += 30;
        break;
      }
    }
    // Substring match in title
    const titleIdx = lowerTitle.indexOf(lowerQuery);
    if (titleIdx >= 0) {
      score += 10;
      titleHighlights.push({ start: titleIdx, end: titleIdx + query.length });
    }
    // Substring match in URL
    const urlIdx = lowerUrl.indexOf(lowerQuery);
    if (urlIdx >= 0) {
      score += 5;
      urlHighlights.push({ start: urlIdx, end: urlIdx + query.length });
    }

    if (score > 0) {
      results.push({ tab, titleHighlights, urlHighlights, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
