import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  fetchPublicGameLogPage,
  parseGameLogPageSizeFromQuery,
} from "@/lib/data/public-game-log";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * Paginated public Game Log for one athlete profile slug.
 * GET /api/athletes/[slug]/game-log?cursor=...&limit=12
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const cursor = request.nextUrl.searchParams.get("cursor");
  const pageSize = parseGameLogPageSizeFromQuery(request.nextUrl.searchParams.get("limit"));

  const result = await fetchPublicGameLogPage(slug, cursor, pageSize);

  switch (result.status) {
    case "ok":
      return NextResponse.json(result.page);
    case "not_found":
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    case "invalid_cursor":
      return NextResponse.json({ error: result.message }, { status: 400 });
    case "error":
      return NextResponse.json({ error: result.message }, { status: 500 });
    default:
      return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
