import { getAthleteAuthSecret, isAthleteAuthConfigured } from "@/lib/auth/config";
import {
  readAthleteSessionFromRequest,
  type AthleteSessionPayload,
} from "@/lib/auth/session";

export function getAthleteSession(request: Request): AthleteSessionPayload | null {
  if (!isAthleteAuthConfigured()) return null;
  const secret = getAthleteAuthSecret();
  if (!secret) return null;
  return readAthleteSessionFromRequest(request, secret);
}

export type { AthleteSessionPayload };
