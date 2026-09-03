import type { Metadata } from "next";

import { SignInForm } from "@/components/auth/sign-in-form";
import { ProgramPage } from "@/components/site";
import { MAGIC_LINK_ERROR_MESSAGES } from "@/lib/auth/config";
import { buildPageMetadata, PRIVATE_ROBOTS_NOINDEX } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Family dashboard sign-in",
  description: "Request a secure parent email link to open your Shooting Challenge athlete dashboard.",
  path: "/dashboard/sign-in",
  robots: PRIVATE_ROBOTS_NOINDEX,
});

type DashboardSignInPageProps = {
  searchParams: Promise<{ error?: string }>;
};

function resolveErrorMessage(code?: string): string | null {
  if (!code) return null;
  if (code in MAGIC_LINK_ERROR_MESSAGES) {
    return MAGIC_LINK_ERROR_MESSAGES[code as keyof typeof MAGIC_LINK_ERROR_MESSAGES];
  }
  return MAGIC_LINK_ERROR_MESSAGES.invalid;
}

export default async function DashboardSignInPage({ searchParams }: DashboardSignInPageProps) {
  const { error } = await searchParams;

  return (
    <ProgramPage
      eyebrow="Family access"
      title="Athlete dashboard sign-in"
      description="Parents and guardians can request a one-time secure email link to view enrolled athletes."
    >
      <SignInForm initialError={resolveErrorMessage(error?.trim())} />
    </ProgramPage>
  );
}
