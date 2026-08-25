export default function AthleteProfileLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div
        className="border-b border-border bg-[linear-gradient(135deg,var(--court-navy)_0%,var(--brand-blue)_55%,#001433_100%)]"
        data-testid="athlete-profile-loading-hero"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-end sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-white/10 ring-2 ring-white/20" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-36 animate-pulse rounded bg-white/15" />
            <div className="h-10 w-64 max-w-full animate-pulse rounded bg-white/20" />
            <div className="h-4 w-48 max-w-full animate-pulse rounded bg-white/10" />
            <div className="flex flex-wrap gap-2 pt-2">
              <div className="h-9 w-28 animate-pulse rounded-md bg-white/10" />
              <div className="h-9 w-20 animate-pulse rounded-md bg-white/10" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="h-28 animate-pulse rounded border border-border bg-brand-medium-gray/30" />
        <div className="h-40 animate-pulse rounded border border-border bg-brand-medium-gray/30" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded border border-border bg-brand-medium-gray/30" />
          <div className="h-56 animate-pulse rounded border border-border bg-brand-medium-gray/30" />
        </div>
      </div>
      <span className="sr-only">Loading athlete profile</span>
    </div>
  );
}
