import type { Metadata } from "next";

import { getProductById } from "@/lib/products";

const product = getProductById("dribbling-challenge");

export const metadata: Metadata = {
  title: product?.name ?? "Dribbling Challenge",
  description: product?.description,
};

export default function DribblingChallengePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">Coming Soon</p>
      <h2 className="mt-4 text-2xl font-bold text-foreground">Season launch in progress</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted">{product?.description}</p>
      <p className="mt-8 text-sm text-muted">
        This program will mirror the Shooting Challenge structure — levels, XP, and leaderboard —
        built for dribbling volume.
      </p>
    </div>
  );
}
