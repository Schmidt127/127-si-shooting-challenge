import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  canAccessDashboardPreview,
  canLoadLiveAthleteDashboardData,
  isDashboardPreviewDevEnvironment,
} from "@/lib/security/dashboard-access";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_SITE_TOKEN = process.env.SITE_ACCESS_TOKEN;

describe("dashboard preview access", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.SITE_ACCESS_TOKEN = "staff-preview-token";
  });

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    process.env.SITE_ACCESS_TOKEN = ORIGINAL_SITE_TOKEN;
  });

  it("allows preview in development without site access token", () => {
    process.env.NODE_ENV = "development";
    delete process.env.SITE_ACCESS_TOKEN;

    expect(isDashboardPreviewDevEnvironment()).toBe(true);
    expect(canAccessDashboardPreview(new Request("https://example.com/dashboard/preview"))).toBe(
      true,
    );
  });

  it("blocks anonymous preview in production when site gate is disabled", () => {
    delete process.env.SITE_ACCESS_TOKEN;

    expect(
      canAccessDashboardPreview(new Request("https://example.com/dashboard/preview")),
    ).toBe(false);
  });

  it("allows staff preview in production with valid site access token", () => {
    const request = new Request(
      "https://example.com/dashboard/preview?site_access_token=staff-preview-token",
    );

    expect(canAccessDashboardPreview(request)).toBe(true);
  });

  it("blocks production preview with invalid site access token", () => {
    const request = new Request(
      "https://example.com/dashboard/preview?site_access_token=wrong",
    );

    expect(canAccessDashboardPreview(request)).toBe(false);
  });

  it("never allows live athlete dashboard data without SC-112 session", () => {
    expect(canLoadLiveAthleteDashboardData(new Request("https://example.com/dashboard"))).toBe(
      false,
    );
  });
});
