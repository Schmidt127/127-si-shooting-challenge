import type { Metadata } from "next";
import Link from "next/link";

import { BracketSvg } from "@/components/bracket/bracket-svg";
import { getLayoutForFixture } from "@/lib/bracket/get-layout";
import { loadBracketFixture } from "@/lib/bracket/load-fixture";
import { renderBracketSvg } from "@/lib/bracket/render";
import { getProductById } from "@/lib/products";

const product = getProductById("tournament-brackets");

export const metadata: Metadata = {
  title: product?.name ?? "Tournament Brackets",
  description: product?.description,
};

export const dynamic = "force-static";

export default async function TournamentBracketsPage() {
  const fixture = await loadBracketFixture("montana-basketball-8.json");
  const layout = getLayoutForFixture(fixture.layout);
  const svg = renderBracketSvg(fixture.matches, fixture.tournamentName, undefined, layout);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted">{fixture.description}</p>
        </div>
        <a
          href="/api/tournament-brackets/svg"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Download SVG
        </a>
      </div>

      <section className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-sm text-amber-100">
        <p className="font-semibold">Formatting preview — sample bracket data</p>
        <p className="mt-2 text-amber-100/85">
          Montana 8-team layout: quarterfinals → loser out → semifinals → consolation →
          championship. Dashed lines show loser drops. Live Airtable tournaments will connect
          here later.
        </p>
      </section>

      {fixture.seeding?.length ? (
        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {fixture.seeding.map((team) => (
            <div
              key={team.seed}
              className="rounded-xl border border-white/[0.08] bg-card/50 px-4 py-3 text-sm"
            >
              <span className="font-semibold text-brand-blue">#{team.seed}</span>{" "}
              <span className="text-foreground">{team.name}</span>
            </div>
          ))}
        </section>
      ) : null}

      <div className="mt-8">
        <BracketSvg svg={svg} title={fixture.tournamentName} />
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        <Link href="/" className="font-medium text-brand-orange transition hover:brightness-110">
          ← Back to all programs
        </Link>
      </p>
    </div>
  );
}
