import { describe, expect, it } from "vitest";

import {
  entryMatchesGradeBand,
  filterByGradeBand,
  gradeToBand,
  withFilteredRanks,
} from "@/lib/data/grade-bands";

describe("gradeToBand", () => {
  it("maps kindergarten and elementary grades", () => {
    expect(gradeToBand("K")).toBe("elementary");
    expect(gradeToBand("Pre K")).toBe("elementary");
    expect(gradeToBand("3")).toBe("elementary");
    expect(gradeToBand("Grade 5")).toBe("elementary");
  });

  it("maps middle and high school", () => {
    expect(gradeToBand("6")).toBe("middle");
    expect(gradeToBand("8")).toBe("middle");
    expect(gradeToBand("9")).toBe("high");
    expect(gradeToBand("12")).toBe("high");
  });

  it("returns other for blank or unparseable", () => {
    expect(gradeToBand("")).toBe("other");
    expect(gradeToBand("—")).toBe("other");
    expect(gradeToBand("College")).toBe("other");
  });
});

describe("filterByGradeBand", () => {
  const rows = [
    { id: "a", grade: "4", rank: 1 },
    { id: "b", grade: "7", rank: 2 },
    { id: "c", grade: "10", rank: 3 },
  ];

  it("filters middle school and re-ranks", () => {
    const filtered = withFilteredRanks(filterByGradeBand(rows, "middle"));
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("b");
    expect(filtered[0]?.rank).toBe(1);
  });

  it("keeps all when band is all", () => {
    expect(filterByGradeBand(rows, "all")).toHaveLength(3);
    expect(entryMatchesGradeBand("11", "high")).toBe(true);
  });
});
