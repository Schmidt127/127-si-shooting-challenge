import { readFile } from "node:fs/promises";
import path from "node:path";

import type { BracketMatch } from "@/lib/bracket/types";

export type BracketFixture = {
  layout?: "volleyball" | "basketball-montana";
  tournamentName: string;
  description?: string;
  seeding?: Array<{ seed: number; name: string }>;
  matches: BracketMatch[];
};

export async function loadBracketFixture(
  fixtureName = "montana-basketball-8.json",
): Promise<BracketFixture> {
  const candidates = [
    path.join(process.cwd(), "fixtures", fixtureName),
    path.join(process.cwd(), "..", "fixtures", fixtureName),
  ];

  let lastError: unknown;
  for (const fixturePath of candidates) {
    try {
      const raw = await readFile(fixturePath, "utf8");
      return JSON.parse(raw) as BracketFixture;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Fixture not found: ${fixtureName}`);
}
