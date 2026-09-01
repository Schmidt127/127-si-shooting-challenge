import { config } from "dotenv";
import { describe, expect, it } from "vitest";

config({ path: ".env.local" });

import { loadHomeworkCatalog } from "@/lib/airtable/homework-queries";

const runLive = process.env.HOMEWORK_LIVE_INTEGRATION === "true";

describe.runIf(runLive)("homework live integration", () => {
  it("loads the production PHA catalog", async () => {
    const result = await loadHomeworkCatalog();
    expect(result.status).not.toBe("error");
    if (result.status !== "error") {
      expect(result.data.totalAssignments).toBe(16);
      expect(result.data.weekGroups.length).toBeGreaterThan(0);
    }
  }, 60_000);
});
