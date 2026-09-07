import { describe, expect, it } from "vitest";

import { PHA_AIRTABLE_FIELDS } from "@/lib/airtable/pha-field-map";
import { filterPhaCandidatesForSubmit } from "@/lib/curriculum/submit-service";

const LIBRARY = "recLibraryCrow0001";
const BAND_5_6 = "recv9aWnHanY2sRgk";
const BAND_3_4 = "reclWDQZzKbVBtdhG";

function pha(input: {
  id: string;
  libraryId?: string;
  active?: boolean;
  gradeBands?: string[];
  weekId?: string | null;
}) {
  return {
    id: input.id,
    fields: {
      [PHA_AIRTABLE_FIELDS.active]: input.active ?? true,
      [PHA_AIRTABLE_FIELDS.homeworkAssignment]: [
        { id: input.libraryId ?? LIBRARY },
      ],
      [PHA_AIRTABLE_FIELDS.gradeBand]: (input.gradeBands ?? [BAND_5_6]).map((id) => ({
        id,
      })),
      [PHA_AIRTABLE_FIELDS.week]:
        input.weekId === null
          ? []
          : [{ id: input.weekId ?? "recWeek0000000001" }],
    },
  };
}

describe("filterPhaCandidatesForSubmit", () => {
  it("requires Active?, matching library, and enrollment Grade Band", () => {
    const matches = filterPhaCandidatesForSubmit({
      records: [
        pha({ id: "recInactive", active: false }),
        pha({ id: "recWrongLibrary", libraryId: "recOtherLibrary001" }),
        pha({ id: "recWrongBand", gradeBands: [BAND_3_4] }),
        pha({ id: "recMatch", gradeBands: [BAND_3_4, BAND_5_6] }),
      ],
      libraryId: LIBRARY,
      enrollmentGradeBandId: BAND_5_6,
    });
    expect(matches.map((row) => row.id)).toEqual(["recMatch"]);
  });

  it("rejects empty PHA Grade Band when enrollment has a band", () => {
    const matches = filterPhaCandidatesForSubmit({
      records: [pha({ id: "recNoBand", gradeBands: [] })],
      libraryId: LIBRARY,
      enrollmentGradeBandId: BAND_5_6,
    });
    expect(matches).toHaveLength(0);
  });
});
