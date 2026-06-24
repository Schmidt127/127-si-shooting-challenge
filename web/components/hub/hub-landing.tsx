import { HubBackground } from "@/components/hub/hub-background";
import { HubFooter } from "@/components/hub/hub-footer";
import { HubHeader } from "@/components/hub/hub-header";
import { HubHero } from "@/components/hub/hub-hero";
import { HubPillars } from "@/components/hub/hub-pillars";
import { HubPrograms } from "@/components/hub/hub-programs";

export function HubLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <HubBackground />

      <div className="relative">
        <HubHeader />

        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <HubHero />
          <HubPillars />
          <HubPrograms />
          <HubFooter />
        </div>
      </div>
    </div>
  );
}
