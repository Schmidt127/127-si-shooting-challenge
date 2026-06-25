import { redirect } from "next/navigation";

/** Legacy URL — program renamed to Referee Clinics. */
export default function KidsRefNowRedirectPage() {
  redirect("/referee-clinics");
}
