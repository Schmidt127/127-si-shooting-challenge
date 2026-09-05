import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  parseHomeworkLinkField,
  resolveHomeworkLinkDelivery,
} from "@/lib/airtable/homework-attachment-delivery";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Authorized delivery for Homework Library URL / URL Additional text fields.
 * Durable https redirects immediately; ephemeral Airtable CDN values fail closed.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const field = parseHomeworkLinkField(request.nextUrl.searchParams.get("field"));

  if (!field) {
    return NextResponse.json({ error: "Unknown homework link field." }, { status: 400 });
  }

  const result = await resolveHomeworkLinkDelivery({
    homeworkId: id,
    field,
  });

  switch (result.status) {
    case "ok": {
      return new NextResponse(null, {
        status: 302,
        headers: {
          Location: result.url,
          "Cache-Control": "private, no-store",
        },
      });
    }
    case "not_found":
      return NextResponse.json({ error: "Homework resource not found." }, { status: 404 });
    case "unavailable":
      return NextResponse.json({ error: result.reason }, { status: 410 });
    case "error":
      return NextResponse.json({ error: result.reason }, { status: 502 });
    default:
      return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
