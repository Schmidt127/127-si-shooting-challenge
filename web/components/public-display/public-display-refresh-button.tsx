"use client";

import { useRouter } from "next/navigation";

import { PUBLIC_DISPLAY_REFRESH_LABEL } from "./public-display-refresh";

export function PublicDisplayRefreshButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md border border-contrast-muted/40 px-3 text-sm font-semibold text-contrast-fg transition hover:border-accent-soft hover:text-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft"
      onClick={() => router.refresh()}
      aria-label={PUBLIC_DISPLAY_REFRESH_LABEL}
    >
      {PUBLIC_DISPLAY_REFRESH_LABEL}
    </button>
  );
}
