import { requestMagicLinkAccess } from "@/lib/auth/magic-link-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MagicLinkRequestBody = {
  email?: string;
};

export async function POST(request: Request): Promise<Response> {
  let body: MagicLinkRequestBody;
  try {
    body = (await request.json()) as MagicLinkRequestBody;
  } catch {
    return Response.json(
      {
        ok: false,
        message:
          "Enter the parent email address used when you registered for the Shooting Challenge.",
      },
      { status: 400 },
    );
  }

  return requestMagicLinkAccess(body.email ?? "", request);
}
