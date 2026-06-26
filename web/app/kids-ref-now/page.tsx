import { redirect } from "next/navigation";

/** Legacy URL — redirects to JR Referee Clinics. */
export default function KidsRefNowRedirectPage() {
  redirect("/jr-referee-clinics");
}
