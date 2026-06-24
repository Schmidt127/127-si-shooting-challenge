export default function LeaderboardLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto mb-8 h-20 w-20">
          <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-accent/30 bg-card text-3xl shadow-lg shadow-orange-500/20">
            🏀
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground">Loading leaderboard…</h1>
        <p className="mt-3 text-sm text-muted">
          Fetching live rankings from Airtable. First load can take 10–20 seconds — hang tight.
        </p>

        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 animate-[loading-bar_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-accent to-orange-500" />
        </div>
      </div>
    </div>
  );
}
