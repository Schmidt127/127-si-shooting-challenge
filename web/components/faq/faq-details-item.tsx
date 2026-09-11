"use client";

import { useCallback, useEffect, useState, type SyntheticEvent } from "react";

import { scCardAccordion } from "@/components/ui/sc-card";
import type { FaqItem } from "@/lib/seo/faq-content";

import { resolveFaqDetailsOpen } from "./faq-hash";

type FaqDetailsItemProps = {
  item: FaqItem;
};

/**
 * Native details/summary accordion row. Closed by default; opens when
 * `location.hash` matches `item.id` (and stays open while the hash matches).
 */
export function FaqDetailsItem({ item }: FaqDetailsItemProps) {
  const [hash, setHash] = useState("");
  const [userOpen, setUserOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const open = resolveFaqDetailsOpen(item.id, hash, userOpen);

  const onToggle = useCallback(
    (event: SyntheticEvent<HTMLDetailsElement>) => {
      const nextOpen = event.currentTarget.open;
      // While the hash targets this item, keep it open (ignore user close).
      if (resolveFaqDetailsOpen(item.id, window.location.hash, null)) {
        setUserOpen(null);
        return;
      }
      setUserOpen(nextOpen);
    },
    [item.id],
  );

  return (
    <details
      id={item.id}
      open={open}
      onToggle={onToggle}
      className={scCardAccordion("group")}
    >
      <summary className="cursor-pointer list-none px-5 py-4 font-display text-lg font-bold text-foreground marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/60 focus-visible:ring-offset-2 sm:text-xl [&::-webkit-details-marker]:hidden">
        <span className="flex items-start justify-between gap-3">
          <span>{item.question}</span>
          <span
            className="mt-1 shrink-0 text-sm font-semibold text-muted motion-safe:transition-transform motion-safe:group-open:rotate-45"
            aria-hidden
          >
            +
          </span>
        </span>
      </summary>
      <div className="border-t border-border px-5 pb-4 pt-3">
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {item.answer}
        </p>
      </div>
    </details>
  );
}
