export default function LeaderboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto mb-8 h-16 w-16">
          <div className="absolute inset-0 animate-ping rounded-full bg-accent/15" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-card shadow-lg shadow-orange-500/10">
            <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground">Loading leaderboard</h1>
        <p className="mt-3 text-sm text-muted">
          Fetching live rankings from Airtable. First load can take 10–20 seconds.
        </p>

        <div className="mt-8 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 animate-[loading-bar_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-accent to-orange-500" />
        </div>
      </div>
    </div>
  );
}
