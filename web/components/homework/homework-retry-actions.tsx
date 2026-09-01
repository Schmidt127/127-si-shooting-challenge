"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { CtaLink } from "@/components/site";

type HomeworkRetryActionsProps = {
  retryable: boolean;
};

export function HomeworkRetryActions({ retryable }: HomeworkRetryActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!retryable) {
    return (
      <CtaLink href="/" variant="secondary">
        ← Shooting Challenge
      </CtaLink>
    );
  }

  return (
    <>
      <button
        type="button"
        data-testid="homework-catalog-retry"
        disabled={isPending}
        onClick={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
        className="inline-flex min-h-[2.75rem] items-center justify-center rounded-md bg-brand-orange px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-orange/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Retrying…" : "Try again"}
      </button>
      <CtaLink href="/" variant="secondary">
        ← Shooting Challenge
      </CtaLink>
    </>
  );
}
