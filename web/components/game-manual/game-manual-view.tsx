import { MediaPanel } from "@/components/catalog/media-panel";
import { IconBook } from "@/components/icons/shoot-icons";
import { CtaLink, ProgramPage } from "@/components/site";
import { EmptyState } from "@/components/ui";

type GameManualViewProps = {
  manualUrl: string | null;
};

export function GameManualView({ manualUrl }: GameManualViewProps) {
  return (
    <ProgramPage
      eyebrow="Official reference"
      title="Game manual"
      description="Rules, scoring, XP, and how the Shooting Challenge works."
      heroVariant="light"
      ambientVariant="default"
    >
      <div className="mx-auto max-w-6xl">
        {manualUrl ? (
          <MediaPanel
            url={manualUrl}
            title="Shooting Challenge Game Manual"
            openLabel="Open game manual"
            externalHint="The manual is hosted on Adobe. Open it in a new tab — Adobe blocks embedding on other sites, which causes the Bad Gateway error in iframes."
          />
        ) : (
          <EmptyState
            title="Manual link not configured"
            description="Paste your Adobe-hosted manual link into NEXT_PUBLIC_GAME_MANUAL_URL and it will display here with an open button. Share the public Adobe link (from Share → Anyone can view). Typical formats: documentcloud.adobe.com or acrobat.adobe.com."
            icon={<IconBook size={40} />}
            action={
              <CtaLink href="/" variant="secondary">
                ← Back to Shooting Challenge
              </CtaLink>
            }
          />
        )}
      </div>
    </ProgramPage>
  );
}
