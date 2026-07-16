import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import { catalogStatePanelClass } from "@/components/catalog/catalog-surface";
import { DisplayHeading } from "@/components/catalog/display-heading";
import { MediaPanel } from "@/components/catalog/media-panel";

type GameManualViewProps = {
  manualUrl: string | null;
};

export function GameManualView({ manualUrl }: GameManualViewProps) {
  return (
    <AmbientPage variant="default">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <DisplayHeading
          eyebrow="Official reference"
          title="Game"
          titleAccent="manual"
          subtitle="Rules, scoring, XP, and how the Shooting Challenge works."
        />

        {manualUrl ? (
          <div className="mt-10">
            <MediaPanel
              url={manualUrl}
              title="Shooting Challenge Game Manual"
              openLabel="Open game manual"
              externalHint="The manual is hosted on Adobe. Open it in a new tab — Adobe blocks embedding on other sites, which causes the Bad Gateway error in iframes."
            />
          </div>
        ) : (
          <div className={`mx-auto mt-10 ${catalogStatePanelClass()}`}>
            <p className="text-sm leading-relaxed text-muted">
              Paste your Adobe-hosted manual link into{" "}
              <code className="rounded bg-brand-light-gray px-1.5 py-0.5 text-foreground">
                NEXT_PUBLIC_GAME_MANUAL_URL
              </code>{" "}
              and it will display here with an open button — same nav and light frame as Homework and
              Tutorials.
            </p>
            <p className="mt-4 text-sm text-muted">
              Share the public Adobe link (from Share → Anyone can view). Typical formats:
              documentcloud.adobe.com or acrobat.adobe.com.
            </p>
            <Link href="/" className="btn-secondary mt-8">
              ← Back to Shooting Challenge
            </Link>
          </div>
        )}
      </div>
    </AmbientPage>
  );
}
