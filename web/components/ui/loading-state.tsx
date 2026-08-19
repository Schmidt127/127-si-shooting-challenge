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
      className={cn("flex flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-24", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-site-sm sm:p-8">
        <p className="text-sm font-bold text-foreground">Please wait</p>
        <div className="relative mx-auto mt-4 h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-brand-light-gray">
          <div
            className="absolute inset-y-0 w-1/3 rounded-full bg-brand-orange"
            style={{ animation: "loading-bar 1.1s ease-in-out infinite" }}
            aria-hidden="true"
          />
        </div>
        <p className="mt-5 text-sm font-medium leading-relaxed text-foreground">{label}</p>
      </div>
    </div>
  );
}
