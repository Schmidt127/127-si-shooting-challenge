import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  AWARD_RECIPIENT_PUBLICATION_FIELD,
  AWARD_RECIPIENT_PUBLICATION_FIELD_CANDIDATES_CHECKED,
  evaluatePublicationFlag,
  isAwardRecipientPubliclyPublished,
  listPublicAwardsForEnrollment,
  mapPublishedPublicAwards,
} from "@/lib/data/public-awards";

const WEB_ROOT = path.resolve(__dirname, "..", "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(WEB_ROOT, relativePath), "utf-8");
}

describe("public award publication gate", () => {
  it("configures Public On Web as the sole publication field", () => {
    expect(AWARD_RECIPIENT_PUBLICATION_FIELD).toBe("Public On Web");
    expect(AWARD_RECIPIENT_PUBLICATION_FIELD_CANDIDATES_CHECKED).toContain("Public On Web");
  });

  it("shows awards when Public On Web is checked", () => {
    const records = [
      {
        id: "recAwardPublic001",
        fields: {
          "Public On Web": true,
          "Award - Display": "Most Improved",
          "Award Description - Display": "Great progress",
          "Award Scope": "Weekly",
          "Date Awarded": "2026-08-15",
          "Award Status": "Pending",
          "Parent Email": "parent@example.com",
          "Tremendous Order ID": "ord_should_not_leak",
          "Award Amount": 25,
        },
      },
    ];

    expect(isAwardRecipientPubliclyPublished(records[0].fields)).toBe(true);
    const publicItems = listPublicAwardsForEnrollment(records);
    expect(publicItems).toHaveLength(1);
    expect(publicItems[0]).toMatchObject({
      awardName: "Most Improved",
      description: "Great progress",
      scopeLabel: "Weekly",
      awardDate: "2026-08-15",
    });
    expect(publicItems[0].key).not.toContain("rec");
  });

  it("hides awards when Public On Web is unchecked", () => {
    const records = [
      {
        id: "recAwardUnchecked01",
        fields: {
          "Public On Web": false,
          "Award - Display": "Weekly MVP",
          "Award Status": "Delivered",
        },
      },
    ];

    expect(isAwardRecipientPubliclyPublished(records[0].fields)).toBe(false);
    expect(mapPublishedPublicAwards(records)).toEqual([]);
    expect(listPublicAwardsForEnrollment(records)).toEqual([]);
  });

  it("hides awards when Public On Web is blank or missing", () => {
    const blank = {
      id: "recAwardBlank0001",
      fields: {
        "Public On Web": "",
        "Award - Display": "Season Champion",
        "Award Status": "Approved",
      },
    };
    const missing = {
      id: "recAwardMissing001",
      fields: {
        "Award - Display": "Season Champion",
        "Award Status": "Approved",
      },
    };
    const nullish = {
      id: "recAwardNullish001",
      fields: {
        "Public On Web": null,
        "Award - Display": "Season Champion",
      },
    };

    expect(isAwardRecipientPubliclyPublished(blank.fields)).toBe(false);
    expect(isAwardRecipientPubliclyPublished(missing.fields)).toBe(false);
    expect(isAwardRecipientPubliclyPublished(nullish.fields)).toBe(false);
    expect(listPublicAwardsForEnrollment([blank, missing, nullish])).toEqual([]);
  });

  it("fails closed when publication field name is null (schema gap)", () => {
    expect(evaluatePublicationFlag({ "Public On Web": true }, null)).toBe(false);
  });

  it("does not publish from Award Status Approved/Delivered alone", () => {
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
          "Public On Web": false,
        },
      },
      {
        id: "recAwardSentOnly01",
        fields: {
          "Award - Display": "Perfect Week Cash",
          "Award Status": "Sent",
        },
      },
    ];

    expect(listPublicAwardsForEnrollment(records)).toEqual([]);
    for (const record of records) {
      expect(isAwardRecipientPubliclyPublished(record.fields)).toBe(false);
    }
  });

  it("does not leak parent emails, Tremendous ids, amounts, or Airtable ids in public mapper output", () => {
    const publicItems = listPublicAwardsForEnrollment([
      {
        id: "recSecretAward0001",
        fields: {
          "Public On Web": true,
          "Award - Display": "Secret Award",
          "Award Description - Display": "Public blurb only",
          "Parent Email": "secret@example.com",
          "Parent Email - Send": "secret-send@example.com",
          "Tremendous Order ID": "ord_secret",
          "Tremendous Reward Link": "https://tremendous.example/secret",
          "Award Amount": 99.5,
          "Coach Feedback - Awards": "private coach note",
        },
      },
    ]);

    expect(publicItems).toHaveLength(1);
    const serialized = JSON.stringify(publicItems);
    expect(serialized).not.toContain("recSecret");
    expect(serialized).not.toContain("secret@");
    expect(serialized).not.toContain("secret-send");
    expect(serialized).not.toContain("ord_secret");
    expect(serialized).not.toContain("tremendous.example");
    expect(serialized).not.toContain("99.5");
    expect(serialized).not.toContain("private coach note");
    expect(publicItems[0]).not.toHaveProperty("amount");
    expect(publicItems[0]).toEqual({
      key: expect.stringMatching(/^pub-award-/),
      awardName: "Secret Award",
      awardDate: null,
      scopeLabel: null,
      description: "Public blurb only",
    });
    expect(Object.keys(publicItems[0]).sort()).toEqual(
      ["awardDate", "awardName", "description", "key", "scopeLabel"].sort(),
    );
  });

  it("keeps private dashboard award loading independent of Public On Web", () => {
    // Private dashboard mapAwardRecords uses Award Status for badge tone (`publiclyVisible`)
    // and loads awards for authorized enrollments without consulting Public On Web.
    const loader = readSource("lib/data/private-dashboard-loader.ts");
    expect(loader).toContain("function mapAwardRecords");
    expect(loader).toContain('publiclyVisible: ["Approved", "Sent", "Delivered"].includes(status)');
    expect(loader).not.toContain("Public On Web");
    expect(loader).not.toContain("isAwardRecipientPubliclyPublished");
    expect(loader).not.toContain("listPublicAwardsForEnrollment");

    // Status alone still must not open the public gate.
    expect(
      isAwardRecipientPubliclyPublished({
        "Award Status": "Delivered",
        "Award - Display": "Dashboard-only award",
      }),
    ).toBe(false);
  });

  it("public athlete profile fetch wires listPublicAwardsForEnrollment", () => {
    const queries = readSource("lib/airtable/queries.ts");
    expect(queries).toContain("listPublicAwardsForEnrollment");
    expect(queries).toContain('"Public On Web"');
    expect(queries).toContain('"Award Recipients"');
    const view = readSource("components/athlete/athlete-profile-view.tsx");
    expect(view).toContain("PublicAwardsSection");
  });
});
