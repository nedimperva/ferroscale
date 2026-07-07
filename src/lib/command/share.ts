/** Shareable command-query URLs: /en?q=hea120+6m+x2+s235 */

const SHARE_PARAM = "q";

/** Extract a shared query from a location search string; null when absent. */
export function readSharedQuery(search: string): string | null {
  try {
    const value = new URLSearchParams(search).get(SHARE_PARAM);
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}

interface LocationLike {
  origin: string;
  pathname: string;
}

/**
 * Build a share URL for the given query on the current page (the pathname
 * keeps the locale prefix). An empty query returns the bare page URL.
 */
export function buildShareUrl(query: string, location: LocationLike): string {
  const base = `${location.origin}${location.pathname}`;
  const trimmed = query.trim();
  if (!trimmed) return base;
  const params = new URLSearchParams();
  params.set(SHARE_PARAM, trimmed);
  return `${base}?${params.toString()}`;
}
