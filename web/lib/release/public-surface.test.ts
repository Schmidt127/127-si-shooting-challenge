import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { SHOOTING_CHALLENGE_NAV } from "@/lib/navigation/shooting-challenge-nav";
import { AIRTABLE_TABLES, LEADERBOARD_FIELDS } from "@/lib/airtable/queries";
import { isPublishedTutorialMedia } from "@/lib/data/tutorials";
import { AirtableApiError, isMissingAirtableViewError } from "@/lib/airtable/errors";
import {
  ADMIN_PLACEHOLDER,
  EMPTY_STATE_COPY,
  FORBIDDEN_CROSSOVER_PRODUCTS,
  LOADING_LABELS,
  NON_CUTOVER_READY_ROUTES,
  PUBLIC_APP_ROUTES,
  SOFTR_CUTOVER_INDICATORS,
} from "@/lib/release/public-surface";
import { ARTICLES_SECTION, SHOUTOUTS_SECTION } from "@/lib/tutorial-media/config";
import { isSiteAccessAuthorized } from "@/lib/security";

const WEB_ROOT = join(process.cwd());

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "coverage") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, acc);
    else if (/\.(ts|tsx|js|jsx|md|mjs)$/.test(entry)) acc.push(full);
  }
  return acc;
}

describe("public routes inventory", () => {
  it("lists the current Shooting Challenge public routes", () => {
    expect(PUBLIC_APP_ROUTES).toContain("/");
    expect(PUBLIC_APP_ROUTES).toContain("/leaderboard");
    expect(PUBLIC_APP_ROUTES).toContain("/admin");
    expect(PUBLIC_APP_ROUTES).toContain("/api/airtable");
  });

  it("keeps nav hrefs inside the known public surface", () => {
    for (const item of SHOOTING_CHALLENGE_NAV) {
      expect(PUBLIC_APP_ROUTES).toContain(item.href);
    }
  });

  it("does not expose admin in the public product nav", () => {
    expect(SHOOTING_CHALLENGE_NAV.some((item) => item.href === "/admin")).toBe(false);
  });

  it("flags demo routes as not cutover-ready", () => {
    for (const route of NON_CUTOVER_READY_ROUTES) {
      expect(PUBLIC_APP_ROUTES).toContain(route);
    }
  });
});

describe("empty and loading state copy", () => {
  it("provides consistent user-facing empty states (no staff Softr instructions)", () => {
    for (const state of Object.values(EMPTY_STATE_COPY)) {
      expect(state.title.length).toBeGreaterThan(0);
      expect(state.description.length).toBeGreaterThan(0);
      expect(state.description.toLowerCase()).not.toContain("mark ");
      expect(state.description.toLowerCase()).not.toContain("ok to publish on softr");
    }
  });

  it("keeps tutorial media section empty copy aligned without staff Softr instructions", () => {
    expect(SHOUTOUTS_SECTION.empty.title).toBe(EMPTY_STATE_COPY.shoutouts.title);
    expect(ARTICLES_SECTION.empty.title).toBe(EMPTY_STATE_COPY.articles.title);
    expect(SHOUTOUTS_SECTION.empty.message).toBe(EMPTY_STATE_COPY.shoutouts.description);
    expect(ARTICLES_SECTION.empty.message).toBe(EMPTY_STATE_COPY.articles.description);
    expect(SHOUTOUTS_SECTION.empty.message.toLowerCase()).not.toContain("ok to publish on softr");
    expect(ARTICLES_SECTION.empty.message.toLowerCase()).not.toContain("ok to publish on softr");
  });

  it("defines loading labels for Airtable-heavy routes", () => {
    expect(LOADING_LABELS.leaderboard).toMatch(/leaderboard/i);
    expect(LOADING_LABELS.homework).toMatch(/homework/i);
    expect(LOADING_LABELS.default).toBe("Loading…");
  });
});

describe("API failure handling", () => {
  it("detects missing Airtable view errors for page error states", () => {
    expect(
      isMissingAirtableViewError(
        new AirtableApiError(422, JSON.stringify({ error: { type: "VIEW_NAME_NOT_FOUND" } })),
      ),
    ).toBe(true);
    expect(isMissingAirtableViewError(new AirtableApiError(401, "Unauthorized"))).toBe(false);
  });
});

describe("no Team Shot Tracker crossover", () => {
  it("keeps forbidden product names out of nav labels and release copy", () => {
    const haystack = [
      ...SHOOTING_CHALLENGE_NAV.map((item) => item.label),
      ...Object.values(EMPTY_STATE_COPY).flatMap((s) => [s.title, s.description]),
      ADMIN_PLACEHOLDER.title,
      ADMIN_PLACEHOLDER.description,
    ]
      .join("\n")
      .toLowerCase();

    for (const forbidden of FORBIDDEN_CROSSOVER_PRODUCTS) {
      expect(haystack).not.toContain(forbidden);
    }
  });

  it("does not reference Team Shot Tracker in web app source modules", () => {
    const files = walkFiles(join(WEB_ROOT, "app")).concat(
      walkFiles(join(WEB_ROOT, "components")),
      walkFiles(join(WEB_ROOT, "lib")),
    );
    const offenders: string[] = [];
    for (const file of files) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      if (file.replace(/\\/g, "/").endsWith("lib/release/public-surface.ts")) continue;
      const text = readFileSync(file, "utf8").toLowerCase();
      if (text.includes("team shot tracker") || text.includes("team-shot-tracker")) {
        offenders.push(relative(WEB_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("public route data handling", () => {
  it("keeps Softr publish field as the dual-run cutover indicator", () => {
    expect(SOFTR_CUTOVER_INDICATORS.publishField).toBe("OK to Publish on Softr");
  });

  it("scopes published tutorial media to Shooting Challenge program + content kind", () => {
    expect(
      isPublishedTutorialMedia(
        {
          "OK to Publish on Softr": true,
          "Tutorial Type": ["Tutorial"],
          "Associated Program": ["Shooting Challenge"],
        },
        "tutorial",
      ),
    ).toBe(true);
    expect(
      isPublishedTutorialMedia(
        {
          "OK to Publish on Softr": true,
          "Tutorial Type": ["Tutorial"],
          "Associated Program": ["Dribbling Challenge"],
        },
        "tutorial",
      ),
    ).toBe(false);
  });

  it("keeps leaderboard Softr sort field declared for Airtable compatibility", () => {
    expect(LEADERBOARD_FIELDS).toContain(SOFTR_CUTOVER_INDICATORS.levelSortField);
  });

  it("reserves dashboard tables without querying them from the public table map comment contract", () => {
    expect(AIRTABLE_TABLES.weeklySummary).toBe("Weekly Athlete Summary");
    expect(AIRTABLE_TABLES.xpEvents).toBe("XP Events");
    expect(AIRTABLE_TABLES.homeworkCompletions).toBe("Homework Completions");
    expect(AIRTABLE_TABLES.videoFeedback).toBe("Video Feedback");
  });
});

describe("placeholder admin safety", () => {
  it("documents that admin must not expose participant data or writes yet", () => {
    expect(ADMIN_PLACEHOLDER.exposesParticipantData).toBe(false);
    expect(ADMIN_PLACEHOLDER.allowsWrites).toBe(false);
    expect(ADMIN_PLACEHOLDER.description.toLowerCase()).toContain("authentication");
  });

  it("does not treat missing SITE_ACCESS_TOKEN as an excuse to skip future auth", () => {
    delete process.env.SITE_ACCESS_TOKEN;
    const request = new Request("https://example.com/admin");
    // Gate disabled ⇒ middleware allows traffic; page itself must still stay non-sensitive.
    expect(isSiteAccessAuthorized(request)).toBe(true);
    expect(ADMIN_PLACEHOLDER.exposesParticipantData).toBe(false);
  });
});

describe("Softr cutover indicators", () => {
  it("records that sitewide noindex remains until cutover approval", () => {
    expect(SOFTR_CUTOVER_INDICATORS.sitewideNoindexUntilCutover).toBe(true);
  });
});

describe("accessibility label contracts", () => {
  it("keeps product nav aria label stable for assistive tech", async () => {
    const { ACCESSIBILITY_LABELS } = await import("@/lib/release/public-surface");
    expect(ACCESSIBILITY_LABELS.productNav.length).toBeGreaterThan(0);
    expect(ACCESSIBILITY_LABELS.gradeBandFilter.toLowerCase()).toContain("grade");
  });
});
