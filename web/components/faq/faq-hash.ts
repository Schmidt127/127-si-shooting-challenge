/**
 * Hash helpers for FAQ accordion deep links (`/faq#video-feedback`).
 */

/** Strip a leading `#` from `location.hash` (or a raw fragment). */
export function normalizeFaqHash(hash: string): string {
  const raw = String(hash ?? "").trim();
  return raw.startsWith("#") ? raw.slice(1) : raw;
}

/** True when the URL fragment targets this FAQ item id. */
export function faqItemMatchesHash(itemId: string, hash: string): boolean {
  const fragment = normalizeFaqHash(hash);
  return Boolean(fragment) && fragment === itemId;
}

/**
 * Resolve whether a FAQ `<details>` should be open.
 * Hash match always wins (keeps the deep-linked answer visible).
 * Otherwise honor an explicit user toggle; default closed.
 */
export function resolveFaqDetailsOpen(
  itemId: string,
  hash: string,
  userOpen: boolean | null,
): boolean {
  if (faqItemMatchesHash(itemId, hash)) return true;
  return userOpen ?? false;
}
