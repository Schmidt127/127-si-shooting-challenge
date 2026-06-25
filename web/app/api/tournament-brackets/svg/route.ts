import { NextResponse } from "next/server";

import { getLayoutForFixture } from "@/lib/bracket/get-layout";
import { loadBracketFixture } from "@/lib/bracket/load-fixture";
import { renderBracketSvg } from "@/lib/bracket/render";

export async function GET() {
  const fixture = await loadBracketFixture("montana-basketball-8.json");
  const layout = getLayoutForFixture(fixture.layout);
  const svg = renderBracketSvg(fixture.matches, fixture.tournamentName, undefined, layout);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": 'inline; filename="montana-basketball-bracket.svg"',
      "Cache-Control": "public, max-age=60",
    },
  });
}
