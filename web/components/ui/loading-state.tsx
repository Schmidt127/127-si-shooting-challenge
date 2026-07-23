import { cn } from "@/lib/utils";

type LoadingStateProps = {
  label?: string;
  className?: string;
};

/**
 * Brand-safe loading panel — orange accent bar, restrained card chrome.
 */
export function LoadingState({ label = "Loading…", className }: LoadingStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center px-6 py-24", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center shadow-site-sm">
        <div className="relative mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-brand-light-gray">
          <div
            className="absolute inset-y-0 w-1/3 rounded-full bg-brand-orange"
            style={{ animation: "loading-bar 1.1s ease-in-out infinite" }}
            aria-hidden="true"
          />
        </div>
        <p className="mt-5 text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
