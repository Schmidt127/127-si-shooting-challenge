import type { Metadata } from "next";
import { headers } from "next/headers";

import { catalogPanelClass } from "@/components/catalog/catalog-surface";
import { CtaLink, ProgramPage, SectionMarker } from "@/components/site";
import { ErrorState } from "@/components/ui";
import {
  authorizeAdminDiagnostics,
  buildAdminDiagnosticsPayload,
  type AdminDiagnosticsPayload,
} from "@/lib/ops/diagnostics";
import { buildSiteAccessRequest } from "@/lib/security";
import { buildPageMetadata, PRIVATE_ROBOTS_NOINDEX } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin diagnostics",
  description: "Staff-only configuration diagnostics. No athlete data.",
  path: "/admin/diagnostics",
  robots: PRIVATE_ROBOTS_NOINDEX,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DiagnosticsPageProps = {
  searchParams: Promise<{
    site_access_token?: string;
    admin_diagnostics_token?: string;
  }>;
};

function PresenceRow({ label, value }: { label: string; value: string | boolean }) {
  const display =
    typeof value === "boolean" ? (value ? "yes" : "no") : value;
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 text-sm last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono text-foreground">{display}</dd>
    </div>
  );
}

function DiagnosticsView({ payload }: { payload: AdminDiagnosticsPayload }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <SectionMarker label="Ops" title="Configuration diagnostics" />
      <p className="text-sm text-muted">
        Aggregate configuration presence only. Athlete data is not loaded. Secret
        values are never shown.
      </p>

      <section
        className={catalogPanelClass({ tint: "neutral" })}
        aria-labelledby="diag-auth-heading"
      >
        <h2 id="diag-auth-heading" className="text-base font-semibold text-foreground">
          Auth gates
        </h2>
        <dl className="mt-3">
          <PresenceRow
            label="Admin gate configured"
            value={payload.auth.adminGateConfigured}
          />
          <PresenceRow
            label="ADMIN_DIAGNOSTICS_TOKEN"
            value={payload.auth.adminDiagnosticsToken}
          />
          <PresenceRow
            label="SITE_ACCESS_TOKEN gate"
            value={payload.auth.siteAccessGateEnabled}
          />
        </dl>
      </section>

      <section
        className={catalogPanelClass({ tint: "neutral" })}
        aria-labelledby="diag-airtable-heading"
      >
        <h2 id="diag-airtable-heading" className="text-base font-semibold text-foreground">
          Airtable
        </h2>
        <dl className="mt-3">
          <PresenceRow label="Configured" value={payload.config.airtable.configured} />
          <PresenceRow label="Token present" value={payload.config.airtable.hasToken} />
          <PresenceRow label="Base ID present" value={payload.config.airtable.hasBaseId} />
        </dl>
      </section>

      <section
        className={catalogPanelClass({ tint: "neutral" })}
        aria-labelledby="diag-authn-heading"
      >
        <h2 id="diag-authn-heading" className="text-base font-semibold text-foreground">
          Athlete auth
        </h2>
        <dl className="mt-3">
          <PresenceRow label="Enabled" value={payload.config.athleteAuth.enabled} />
          <PresenceRow
            label="Secret configured"
            value={payload.config.athleteAuth.secretConfigured}
          />
          <PresenceRow label="Test mode" value={payload.config.athleteAuth.testMode} />
          <PresenceRow
            label="Magic-link store available"
            value={payload.config.athleteAuth.magicLinkStoreAvailable}
          />
          <PresenceRow
            label="Upstash configured"
            value={payload.config.athleteAuth.upstashConfigured}
          />
        </dl>
      </section>

      <section
        className={catalogPanelClass({ tint: "neutral" })}
        aria-labelledby="diag-secrets-heading"
      >
        <h2 id="diag-secrets-heading" className="text-base font-semibold text-foreground">
          Secret presence (values redacted)
        </h2>
        <dl className="mt-3">
          {Object.entries(payload.secrets).map(([key, value]) => (
            <PresenceRow key={key} label={key} value={value} />
          ))}
        </dl>
      </section>

      <p className="text-xs text-muted" role="status">
        Generated {payload.generatedAt} · Cache-Control: no-store · Athlete data
        exposed: no · Secrets exposed: no
      </p>

      <CtaLink href="/admin" variant="secondary">
        ← Back to admin
      </CtaLink>
    </div>
  );
}

/**
 * Staff diagnostics page — force-dynamic, no-store semantics, auth required.
 * Public URL (with basePath): /shoot/admin/diagnostics
 */
export default async function AdminDiagnosticsPage({
  searchParams,
}: DiagnosticsPageProps) {
  const params = await searchParams;
  const headerStore = await headers();

  const cookieParts = [headerStore.get("cookie") ?? ""];
  if (params.admin_diagnostics_token?.trim()) {
    cookieParts.push(
      `admin_diagnostics_token=${encodeURIComponent(params.admin_diagnostics_token.trim())}`,
    );
  }

  const accessRequest = buildSiteAccessRequest({
    authorizationHeader: headerStore.get("authorization"),
    cookieHeader: cookieParts.filter(Boolean).join("; "),
    queryToken: params.site_access_token?.trim() || null,
    pathname: "/admin/diagnostics",
  });

  // Prefer dedicated admin token from query when present.
  let authRequest = accessRequest;
  if (params.admin_diagnostics_token?.trim()) {
    const url = new URL(accessRequest.url);
    url.searchParams.set(
      "admin_diagnostics_token",
      params.admin_diagnostics_token.trim(),
    );
    authRequest = new Request(url, {
      headers: accessRequest.headers,
    });
  }

  const auth = authorizeAdminDiagnostics(authRequest);
  if (!auth.ok) {
    return (
      <ProgramPage
        eyebrow="Staff only"
        title="Admin diagnostics"
        description="Configuration diagnostics require staff authorization."
        heroVariant="light"
        ambientVariant="default"
      >
        <ErrorState
          title={auth.status === 401 ? "Unauthorized" : "Forbidden"}
          message={auth.reason}
        />
        <CtaLink href="/admin" variant="secondary" className="mt-8">
          ← Back to admin
        </CtaLink>
      </ProgramPage>
    );
  }

  const payload = buildAdminDiagnosticsPayload();

  return (
    <ProgramPage
      eyebrow="Staff only"
      title="Admin diagnostics"
      description="Server-only configuration validation with secret redaction."
      heroVariant="light"
      ambientVariant="default"
      meta={<span role="status">Participant data exposed: no · Writes enabled: no</span>}
    >
      <DiagnosticsView payload={payload} />
    </ProgramPage>
  );
}
