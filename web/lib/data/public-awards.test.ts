import { describe, expect, it } from "vitest";

import {
  AWARD_RECIPIENT_PUBLICATION_FIELD,
  evaluatePublicationFlag,
  isAwardRecipientPubliclyPublished,
  listPublicAwardsForEnrollment,
  mapPublishedPublicAwards,
} from "@/lib/data/public-awards";

describe("public award publication gate", () => {
  it("records that no Award Recipients publication field is configured yet", () => {
    expect(AWARD_RECIPIENT_PUBLICATION_FIELD).toBeNull();
  });

  it("hides awards when publication values are missing", () => {
    const records = [
      {
        id: "recAwardPrivate001",
        fields: {
          "Award - Display": "Most Improved",
          "Award Status": "Delivered",
          "Award Description - Display": "Great progress",
          "Parent Email": "parent@example.com",
        },
      },
    ];

    expect(isAwardRecipientPubliclyPublished(records[0].fields)).toBe(false);
    expect(evaluatePublicationFlag(records[0].fields, "Published?")).toBe(false);
    expect(mapPublishedPublicAwards(records)).toEqual([]);
    expect(listPublicAwardsForEnrollment(records)).toEqual([]);
  });

  it("treats an explicit Published? checkbox as public when present on the record", () => {
    expect(
      evaluatePublicationFlag({ "Published?": true, "Award - Display": "Weekly MVP" }, "Published?"),
    ).toBe(true);
    expect(
      evaluatePublicationFlag({ "Published?": false, "Award - Display": "Weekly MVP" }, "Published?"),
    ).toBe(false);
  });

  it("keeps private-only records hidden even when status is Approved/Delivered", () => {
    const records = [
      {
        id: "recAwardApproved01",
        fields: {
          "Award - Display": "Weekly MVP",
          "Award Status": "Approved",
          "Date Awarded": "2026-08-01",
        },
      },
      {
        id: "recAwardDelivered1",
        fields: {
          "Award - Display": "Season Champion",
          "Award Status": "Delivered",
        },
      },
    ];

    expect(listPublicAwardsForEnrollment(records)).toEqual([]);
  });

  it("does not leak parent emails or Airtable ids in the empty public list", () => {
    const publicItems = listPublicAwardsForEnrollment([
      {
        id: "recSecretAward0001",
        fields: {
          "Award - Display": "Secret Award",
          "Parent Email - Send": "secret@example.com",
          "Tremendous Order ID": "ord_secret",
        },
      },
    ]);

    expect(publicItems).toEqual([]);
    expect(JSON.stringify(publicItems)).not.toContain("recSecret");
    expect(JSON.stringify(publicItems)).not.toContain("secret@");
  });
});
