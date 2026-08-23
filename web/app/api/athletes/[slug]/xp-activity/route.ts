import { NextResponse } from "next/server";

import { loadXpActivityPageForSlug } from "@/lib/data/xp-activity-loader";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");

  const result = await loadXpActivityPageForSlug(slug, cursor);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json(result.data);
}
