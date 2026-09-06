import { describe, expect, it } from "vitest";

import {
  ALL_GRADE_BANDS_ID,
  ALL_GRADE_BANDS_LABEL,
  buildGradeBandFilterOptions,
  countEntriesByGradeBand,
  entryMatchesGradeBand,
  filterByGradeBand,
  gradeBandNameToSlug,
  resolveSelectedGradeBandId,
  withFilteredRanks,
} from "@/lib/data/grade-bands";

const activeRecords = [
  {
    id: "recBandK2",
    fields: {
      "Grade Band Name": "K-2",
      "Active?": true,
      "Sort Order": 1,
      "Min Grade": -1,
      "Max Grade": 2,
    },
  },
  {
    id: "recBand34",
    fields: {
      "Grade Band Name": "3-4",
      "Active?": true,
      "Sort Order": 2,
      "Min Grade": 3,
      "Max Grade": 4,
    },
  },
  {
    id: "recBandInactive",
    fields: {
      "Grade Band Name": "Legacy Elementary",
      "Active?": false,
      "Sort Order": 0,
      "Min Grade": 0,
      "Max Grade": 5,
    },
  },
  {
    id: "recBand78",
    fields: {
      "Grade Band Name": "7-8",
      "Active?": true,
      "Sort Order": 4,
      "Min Grade": 7,
      "Max Grade": 8,
    },
  },
];

describe("gradeBandNameToSlug", () => {
  it("uses Grade Band Name as a stable public slug", () => {
    expect(gradeBandNameToSlug("3-4")).toBe("3-4");
    expect(gradeBandNameToSlug("K-2")).toBe("k-2");
    expect(gradeBandNameToSlug("PreK–K")).toBe("prek-k");
  });
});

describe("buildGradeBandFilterOptions", () => {
  it("prepends All Grade Bands and keeps only active rows in Sort Order", () => {
    const options = buildGradeBandFilterOptions(activeRecords);
    expect(options[0]).toMatchObject({
      id: ALL_GRADE_BANDS_ID,
      label: ALL_GRADE_BANDS_LABEL,
    });
    expect(options.map((o) => o.id)).toEqual(["all", "k-2", "3-4", "7-8"]);
    expect(options.some((o) => o.label === "Legacy Elementary")).toBe(false);
  });

  it("returns only All when records are empty", () => {
    expect(buildGradeBandFilterOptions([])).toEqual([
      expect.objectContaining({ id: ALL_GRADE_BANDS_ID, label: ALL_GRADE_BANDS_LABEL }),
    ]);
  });
});

describe("resolveSelectedGradeBandId", () => {
  const options = buildGradeBandFilterOptions(activeRecords);

  it("resolves configured band query values", () => {
    expect(resolveSelectedGradeBandId("3-4", options)).toBe("3-4");
    expect(resolveSelectedGradeBandId("K-2", options)).toBe("k-2");
  });

  it("falls back to All for empty, stale, and legacy school-bucket queries", () => {
    expect(resolveSelectedGradeBandId(null, options)).toBe(ALL_GRADE_BANDS_ID);
    expect(resolveSelectedGradeBandId("", options)).toBe(ALL_GRADE_BANDS_ID);
    expect(resolveSelectedGradeBandId("elementary", options)).toBe(ALL_GRADE_BANDS_ID);
    expect(resolveSelectedGradeBandId("recBand34", options)).toBe(ALL_GRADE_BANDS_ID);
    expect(resolveSelectedGradeBandId("legacy-elementary", options)).toBe(ALL_GRADE_BANDS_ID);
  });
});

describe("filterByGradeBand", () => {
  const options = buildGradeBandFilterOptions(activeRecords);
  const rows = [
    { id: "a", gradeBandLabel: "3-4", rank: 1 },
    { id: "b", gradeBandLabel: "7-8", rank: 2 },
    { id: "c", gradeBandLabel: null, rank: 3 },
    { id: "d", gradeBandLabel: "K-2", rank: 4 },
  ];

  it("filters by configured Grade Band Label slug and re-ranks", () => {
    const filtered = withFilteredRanks(filterByGradeBand(rows, "3-4"));
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("a");
    expect(filtered[0]?.rank).toBe(1);
  });

  it("keeps all when band is All Grade Bands", () => {
    expect(filterByGradeBand(rows, ALL_GRADE_BANDS_ID)).toHaveLength(4);
    expect(entryMatchesGradeBand({ gradeBandLabel: "7-8" }, "7-8")).toBe(true);
    expect(entryMatchesGradeBand({ gradeBandLabel: null }, "7-8")).toBe(false);
  });

  it("counts entries per band including All", () => {
    const counts = countEntriesByGradeBand(rows, options);
    expect(counts.all).toBe(4);
    expect(counts["3-4"]).toBe(1);
    expect(counts["k-2"]).toBe(1);
    expect(counts["7-8"]).toBe(1);
  });
});
