import { describe, expect, it } from "vitest";

import {
  AWARD_RECIPIENTS_PUBLICATION_FIELD_CANDIDATES,
  AWARD_RECIPIENTS_SCHEMA_FIELDS_AUG_2026,
  listPublicAwardsForProfile,
  resolvePublicAwardsGate,
} from "@/lib/data/public-awards";

describe("public awards publication gate", () => {
  it("confirms Aug 2026 Award Recipients snapshot has no publication field", () => {
    for (const candidate of AWARD_RECIPIENTS_PUBLICATION_FIELD_CANDIDATES) {
      expect(AWARD_RECIPIENTS_SCHEMA_FIELDS_AUG_2026).not.toContain(candidate);
    }
    expect(AWARD_RECIPIENTS_SCHEMA_FIELDS_AUG_2026).toHaveLength(40);
  });

  it("fail-closes public award display when publication field is missing", () => {
    const gate = resolvePublicAwardsGate();
    expect(gate.status).toBe("blocked_missing_publication_field");
    if (gate.status === "blocked_missing_publication_field") {
      expect(gate.awards).toEqual([]);
      expect(gate.reason).toMatch(/no publication field/i);
      expect(gate.schemaSnapshot).toContain("prod-20260831");
    }
    expect(listPublicAwardsForProfile()).toEqual([]);
  });

  it("does not treat Award Status as a publication control", () => {
    const gate = resolvePublicAwardsGate({
      awardRecipientFieldNames: ["Award Status", "Date Awarded", "Award - Display"],
    });
    expect(gate.status).toBe("blocked_missing_publication_field");
  });

  it("opens the gate only when an explicit publication field exists", () => {
    const gate = resolvePublicAwardsGate({
      awardRecipientFieldNames: [
        ...AWARD_RECIPIENTS_SCHEMA_FIELDS_AUG_2026,
        "Published?",
      ],
    });
    expect(gate.status).toBe("ok");
    if (gate.status === "ok") {
      expect(gate.publicationField).toBe("Published?");
      // Still returns empty until a dedicated published-row loader is implemented.
      expect(gate.awards).toEqual([]);
    }
  });
});
