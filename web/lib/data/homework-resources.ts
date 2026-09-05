/**
 * Public-safe homework resource hrefs.
 *
 * Airtable attachment CDN URLs expire ("URL link has expired"). Never bake those
 * into ISR HTML. Prefer durable external https, or an app delivery path that
 * re-fetches a fresh authorized URL at request time.
 */

export const HOMEWORK_ATTACHMENT_FIELDS = ["Docs", "Cover Images"] as const;
export type HomeworkAttachmentField = (typeof HOMEWORK_ATTACHMENT_FIELDS)[number];

export const HOMEWORK_LINK_FIELDS = ["URL", "URL Additional"] as const;
export type HomeworkLinkField = (typeof HOMEWORK_LINK_FIELDS)[number];

export type HomeworkResourceAvailability = "available" | "unavailable" | "absent";

const EPHEMERAL_ATTACHMENT_HOST_SUFFIXES = [
  "airtableusercontent.com",
  "dl.airtable.com",
] as const;

export function isEphemeralAirtableAttachmentUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    return EPHEMERAL_ATTACHMENT_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

export function isDurableHttpUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return !isEphemeralAirtableAttachmentUrl(trimmed);
  } catch {
    return false;
  }
}

/** App-router path (no basePath) for authorized attachment delivery. */
export function buildHomeworkAttachmentDeliveryPath(
  homeworkId: string,
  attachmentId: string,
  field: HomeworkAttachmentField,
): string {
  const params = new URLSearchParams({ field });
  return `/api/homework/${encodeURIComponent(homeworkId)}/attachment/${encodeURIComponent(attachmentId)}?${params.toString()}`;
}

/** App-router path for text-link fields that may need a live Airtable re-read. */
export function buildHomeworkLinkDeliveryPath(
  homeworkId: string,
  field: HomeworkLinkField,
): string {
  const params = new URLSearchParams({ field });
  return `/api/homework/${encodeURIComponent(homeworkId)}/link?${params.toString()}`;
}

export function resolvePublicHomeworkLink(
  homeworkId: string,
  field: HomeworkLinkField,
  rawUrl: string,
): { href: string; availability: HomeworkResourceAvailability } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { href: "", availability: "absent" };
  }
  if (isDurableHttpUrl(trimmed)) {
    return { href: trimmed, availability: "available" };
  }
  if (isEphemeralAirtableAttachmentUrl(trimmed)) {
    // Text field may hold a stale CDN URL; re-read the field at click time in case
    // operators refresh the value. Delivery still fails closed if still ephemeral/stale.
    return {
      href: buildHomeworkLinkDeliveryPath(homeworkId, field),
      availability: "available",
    };
  }
  return { href: "", availability: "unavailable" };
}

type RawAttachment = {
  id?: string;
  url?: string;
  filename?: string;
};

export type PublicHomeworkAttachment = {
  id: string;
  filename: string;
  /** Public-safe href — delivery path or durable https. Never ephemeral CDN. */
  url: string;
  availability: Exclude<HomeworkResourceAvailability, "absent">;
};

export function mapPublicHomeworkAttachments(
  homeworkId: string,
  field: HomeworkAttachmentField,
  value: unknown,
): PublicHomeworkAttachment[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const raw = item as RawAttachment;
      const attachmentId = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : "";
      const filename =
        typeof raw.filename === "string" && raw.filename.trim()
          ? raw.filename.trim()
          : "Download";
      const sourceUrl = typeof raw.url === "string" ? raw.url.trim() : "";

      if (!attachmentId && !sourceUrl) return null;

      // Prefer stable attachment id → delivery path (fresh URL on each request).
      if (attachmentId) {
        return {
          id: attachmentId,
          filename,
          url: buildHomeworkAttachmentDeliveryPath(homeworkId, attachmentId, field),
          availability: "available" as const,
        };
      }

      // No attachment id: only durable external URLs may be exposed.
      if (isDurableHttpUrl(sourceUrl)) {
        return {
          id: sourceUrl,
          filename,
          url: sourceUrl,
          availability: "available" as const,
        };
      }

      return {
        id: sourceUrl || filename,
        filename,
        url: "",
        availability: "unavailable" as const,
      };
    })
    .filter((item): item is PublicHomeworkAttachment => item !== null);
}

export function resolveHomeworkCategoryLabel(input: {
  homeworkSlot: string;
  homeworkNumber: string;
  topics: string[];
  bookAbbreviation: string;
}): string {
  if (input.homeworkSlot.trim()) return input.homeworkSlot.trim();
  if (input.homeworkNumber.trim()) return input.homeworkNumber.trim();
  if (input.topics[0]?.trim()) return input.topics[0].trim();
  if (input.bookAbbreviation.trim()) return input.bookAbbreviation.trim();
  return "Assignment";
}

export type HomeworkDueStatus = "no_due" | "past_due" | "due_soon" | "upcoming";

/** Calendar-day due status for public catalog chips (not athlete completion). */
export function resolveHomeworkDueStatus(
  dueDate: string | null,
  now: Date = new Date(),
): HomeworkDueStatus {
  if (!dueDate) return "no_due";
  const due = Date.parse(`${dueDate}T23:59:59`);
  if (Number.isNaN(due)) return "no_due";

  const todayStart = Date.parse(
    `${now.toISOString().slice(0, 10)}T00:00:00`,
  );
  if (due < todayStart) return "past_due";

  const soon = todayStart + 3 * 24 * 60 * 60 * 1000;
  if (due <= soon) return "due_soon";
  return "upcoming";
}

export function homeworkDueStatusLabel(status: HomeworkDueStatus): string | null {
  switch (status) {
    case "past_due":
      return "Past due";
    case "due_soon":
      return "Due soon";
    case "upcoming":
      return "Upcoming";
    default:
      return null;
  }
}
