import Link from "next/link";

export default function AthleteProfileNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Profile</p>
      <h1 className="font-display mt-3 text-2xl text-foreground">Athlete profile not found</h1>
      <p className="mt-3 text-sm text-muted">
        This public profile is unavailable. It may be disabled, or the link may be incorrect.
      </p>
      <Link
        href="/leaderboard"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-brand-blue px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
      >
        Back to standings
      </Link>
    </div>
  );
}
