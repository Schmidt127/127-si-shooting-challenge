export default function AthleteProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10" aria-busy="true" aria-live="polite">
      <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-10 w-64 animate-pulse rounded bg-white/10" />
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-xl bg-white/10" />
        <div className="h-48 animate-pulse rounded-xl bg-white/10" />
      </div>
      <span className="sr-only">Loading athlete profile</span>
    </div>
  );
}
