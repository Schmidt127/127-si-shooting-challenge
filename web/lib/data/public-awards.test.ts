import { describe, expect, it } from "vitest";

import {
  AWARD_RECIPIENT_PUBLICATION_FIELD,
  evaluatePublicationFlag,
  findLeakedPrivateAwardMaterial,
  isAwardRecipientPubliclyPublished,
  listPublicAwardsForEnrollment,
  mapPublishedPublicAwards,
} from "@/lib/data/public-awards";

describe("public award publication gate (Public On Web)", () => {
  it("configures the exact Public On Web field", () => {
    expect(AWARD_RECIPIENT_PUBLICATION_FIELD).toBe("Public On Web");
  });

  it("allows public display when Public On Web is true", () => {
    const records = [
      {
        id: "recAwardPublic0001",
        fields: {
          "Public On Web": true,
          "Award - Display": "Weekly MVP",
          "Award Description - Display": "Strong week",
          "Award Scope": { name: "Weekly" },
          "Date Awarded": "2026-09-01T12:00:00.000Z",
          "Award Status": "Delivered",
          "Award Amount": 25,
          "Parent Email - Send": "parent@example.com",
        },
      },
    ];

    expect(isAwardRecipientPubliclyPublished(records[0].fields)).toBe(true);
    const publicItems = listPublicAwardsForEnrollment(records);
    expect(publicItems).toHaveLength(1);
    expect(publicItems[0].awardName).toBe("Weekly MVP");
    expect(publicItems[0].description).toBe("Strong week");
    expect(publicItems[0].key).not.toContain("rec");
    expect(publicItems[0]).not.toHaveProperty("amount");
    expect(publicItems[0]).not.toHaveProperty("recipientStatus");

    const html = JSON.stringify(publicItems);
    expect(html).not.toContain("parent@");
    expect(html).not.toContain("25");
    expect(html).not.toContain("Delivered");
    expect(html).not.toMatch(/rec[A-Za-z0-9]{14}/);
    expect(findLeakedPrivateAwardMaterial(html)).toBeNull();
  });

  it("hides awards when Public On Web is false", () => {
    expect(
      evaluatePublicationFlag(
        { "Public On Web": false, "Award - Display": "Hidden", "Award Status": "Approved" },
        "Public On Web",
      ),
    ).toBe(false);
    expect(
      mapPublishedPublicAwards([
        {
          id: "recAwardFalse00001",
          fields: { "Public On Web": false, "Award - Display": "Hidden", "Award Status": "Approved" },
        },
      ]),
    ).toEqual([]);
  });

  it("hides awards when Public On Web is blank", () => {
    expect(evaluatePublicationFlag({ "Public On Web": "" }, "Public On Web")).toBe(false);
    expect(evaluatePublicationFlag({ "Public On Web": null }, "Public On Web")).toBe(false);
  });

  it("hides awards when Public On Web is missing from the record", () => {
    const fields = {
      "Award - Display": "Most Improved",
      "Award Status": "Delivered",
      "Award Description - Display": "Great progress",
      "Parent Email": "parent@example.com",
    };
    expect(isAwardRecipientPubliclyPublished(fields)).toBe(false);
    expect(evaluatePublicationFlag(fields, "Public On Web")).toBe(false);
    expect(mapPublishedPublicAwards([{ id: "recAwardMissing001", fields }])).toEqual([]);
  });

  it("never uses Award Status as a public-visibility substitute", () => {
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

  it("keeps unauthorized private award details out of public mapping", () => {
    const publicItems = listPublicAwardsForEnrollment([
      {
        id: "recSecretAward0001",
        fields: {
          "Public On Web": false,
          "Award - Display": "Secret Award",
          "Award Amount": 100,
          "Coach Feedback - Awards": "Private coach note",
          "Parent Email - Send": "secret@example.com",
          "Tremendous Order ID": "ord_secret",
          "Award Status": "Sent",
        },
      },
    ]);

    expect(publicItems).toEqual([]);
    const serialized = JSON.stringify(publicItems);
    expect(serialized).not.toContain("recSecret");
    expect(serialized).not.toContain("secret@");
    expect(serialized).not.toContain("Private coach");
    expect(serialized).not.toContain("ord_secret");
    expect(findLeakedPrivateAwardMaterial(serialized)).toBeNull();
  });
});
