"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

type FamilyEnrollmentOption = {
  displayName: string;
  selectionKey: string;
  programLabel?: string;
  seasonLabel?: string;
};

type FamilyEnrollmentSwitcherProps = {
  enrollments: FamilyEnrollmentOption[];
  activeSelectionKey?: string;
  /** When true, render full-width selection cards (select page). */
  variant?: "switcher" | "select";
};

export function FamilyEnrollmentSwitcher({
  enrollments,
  activeSelectionKey,
  variant = "switcher",
}: FamilyEnrollmentSwitcherProps) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function selectEnrollment(selectionKey: string) {
    if (selectionKey === activeSelectionKey) return;
    setPendingKey(selectionKey);
    setError(null);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "/shoot";
      const response = await fetch(`${basePath}/api/auth/select-enrollment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ selectionKey }),
      });
      if (!response.ok) {
        setError("That athlete is not available for this sign-in. Choose another or sign in again.");
        return;
      }
      const payload = (await response.json()) as { redirectTo?: string };
      router.push(payload.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Could not switch athletes. Try again.");
    } finally {
      setPendingKey(null);
    }
  }

  if (enrollments.length === 0) return null;

  if (variant === "select") {
    return (
      <div className="space-y-3" data-testid="dashboard-child-select">
        {enrollments.map((item) => {
          const pending = pendingKey === item.selectionKey;
          return (
            <form
              key={item.selectionKey}
              action={(process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "/shoot") + "/api/auth/select-enrollment"}
              method="post"
              onSubmit={(event) => {
                event.preventDefault();
                void selectEnrollment(item.selectionKey);
              }}
            >
              <input type="hidden" name="selectionKey" value={item.selectionKey} />
              <button
                type="submit"
                disabled={pendingKey !== null}
                className={cn(
                  "flex w-full min-h-14 flex-col items-start rounded-xl border border-border bg-card px-5 py-4 text-left transition-colors",
                  "hover:border-brand-blue/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                  pending && "opacity-70",
                )}
                data-testid="dashboard-child-select-option"
              >
                <span className="font-display text-lg text-foreground">{item.displayName}</span>
                <span className="mt-1 text-sm text-muted">
                  {[item.programLabel, item.seasonLabel].filter(Boolean).join(" · ")}
                </span>
                <span className="mt-2 text-sm font-semibold text-brand-blue">
                  {pending ? "Opening…" : "Open dashboard"}
                </span>
              </button>
            </form>
          );
        })}
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div data-testid="dashboard-family-switcher">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-blue">
        Family athletes
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {enrollments.map((item) => {
          const active = item.selectionKey === activeSelectionKey;
          const pending = pendingKey === item.selectionKey;
          return (
            <form
              key={item.selectionKey}
              action={(process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "/shoot") + "/api/auth/select-enrollment"}
              method="post"
              onSubmit={(event) => {
                event.preventDefault();
                void selectEnrollment(item.selectionKey);
              }}
              className="inline"
            >
              <input type="hidden" name="selectionKey" value={item.selectionKey} />
              <button
                type="submit"
                disabled={pendingKey !== null || active}
                className={cn(
                  "min-h-10 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "border-brand-blue bg-brand-blue text-white"
                    : "border-border bg-card text-foreground hover:border-brand-blue/40",
                  pending && "opacity-70",
                )}
                aria-current={active ? "page" : undefined}
                data-testid="dashboard-family-switch-option"
              >
                {pending ? "Switching…" : item.displayName}
              </button>
            </form>
          );
        })}
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
