import { cookies } from "next/headers";

import { getAthleteSession } from "@/lib/security";

export async function getAthleteSessionFromCookies() {
  const cookieStore = await cookies();
  const request = new Request("http://local/", {
    headers: { cookie: cookieStore.toString() },
  });
  return getAthleteSession(request);
}
