import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  parseHomeworkAttachmentField,
  resolveHomeworkAttachmentDelivery,
} from "@/lib/airtable/homework-attachment-delivery";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

/**
 * Authorized delivery for Homework Library attachment fields (Docs, Cover Images).
 * Re-fetches a fresh Airtable attachment URL and redirects — never embeds CDN URLs
 * in catalog HTML, and never logs the signed Location.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id, attachmentId } = await context.params;
  const field = parseHomeworkAttachmentField(request.nextUrl.searchParams.get("field"));

  if (!field) {
    return NextResponse.json({ error: "Unknown homework attachment field." }, { status: 400 });
  }

  const result = await resolveHomeworkAttachmentDelivery({
    homeworkId: id,
    attachmentId,
    field,
  });

  switch (result.status) {
    case "ok": {
      // 302 to the fresh authorized URL. Do not cache; do not log Location.
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
