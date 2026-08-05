/**
 * SC-003 Testing Views matching helpers (table-specific exact names only).
 * Used by verify_testing_views.mjs and offline unit tests.
 */

export function normalizeName(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Match a view on one table only. Does not use partial / contains matching.
 * Order: canonical view_name → name_aliases_acceptable → acceptable_interim_views.
 * name_aliases_unacceptable_without_filter are never treated as matches.
 */
export function findMatchingView(tableViews, specView) {
  const wanted = normalizeName(specView.view_name);
  const aliases = (specView.name_aliases_acceptable || []).map(normalizeName);
  const unacceptable = new Set(
    (specView.name_aliases_unacceptable_without_filter || []).map(normalizeName)
  );

  const exact = tableViews.find((v) => normalizeName(v.name) === wanted);
  if (exact && !unacceptable.has(normalizeName(exact.name))) {
    return { match: exact, match_kind: "canonical" };
  }

  const alias = tableViews.find((v) => {
    const n = normalizeName(v.name);
    return aliases.includes(n) && !unacceptable.has(n);
  });
  if (alias) return { match: alias, match_kind: "acceptable_alias" };

  const interim = (specView.acceptable_interim_views || []).map(normalizeName);
  const interimHit = tableViews.find((v) => {
    const n = normalizeName(v.name);
    return interim.includes(n) && !unacceptable.has(n);
  });
  if (interimHit) return { match: interimHit, match_kind: "interim_only" };

  return { match: null, match_kind: "missing" };
}

export function countRequiredViews(spec) {
  return (spec.views || []).filter((v) => !v.optional).length;
}
