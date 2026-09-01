import { asText } from "@/lib/data/airtable-values";
import { formatShots, formatXp, formatXpSourceLabel } from "@/lib/formatters";
import {
  resolveVideoDisplayFileNameWithFallback,
} from "@/lib/video-display-filename";
import type { XpEventSummary } from "@/types/xp";

export type GameLogPresentation = {
  /** Single-line activity label for row 1 (e.g. "Shot Submission — 1,250 shots"). */
  headline: string;
  /** Row 2 left detail (Zoom meeting name). */
  subline?: string | null;
  /** When true, ISO date renders in row 2 column 3 instead of row 2 column 1. */
  dateOnSecondRowRight?: boolean;
  /** Optional note after the date on row 2 (e.g. Extra credit +125 XP). */
  dateTagline?: string | null;
};

const HEADLINE_SEPARATOR = " — ";

function cleanReason(reason: string): string {
  return reason.replace(/\.\s*$/, "").trim();
}

function joinHeadline(label: string, detail: string | null | undefined): string {
  const trimmed = detail?.trim();
  return trimmed ? `${label}${HEADLINE_SEPARATOR}${trimmed}` : label;
}

function extractShotCount(reason: string): number | null {
  const match = reason.match(/(\d[\d,]*)\s+shots?\b/i);
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractPercentFromText(text: string): string | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? `${match[1]}%` : null;
}

function extractMilestonePercent(source: string, reason: string): string | null {
  const fromReason =
    reason.match(/(\d+(?:\.\d+)?)\s*%\s*(?:\w+\s+)?milestone/i)?.[1] ??
    reason.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?(?:target\s+)?goal/i)?.[1];
  if (fromReason) return `${fromReason}%`;
  return extractPercentFromText(`${source} ${reason}`);
}

function extractWeeklyTargetPercent(source: string, reason: string): string | null {
  const fromSource = source.match(/weekly threshold\s*(\d+)/i)?.[1];
  if (fromSource) return `${fromSource}%`;
  const fromReason = reason.match(/reached\s+(\d+(?:\.\d+)?)\s*%\s*of\s+weekly/i)?.[1];
  if (fromReason) return `${fromReason}%`;
  return extractPercentFromText(reason);
}

function extractStreakDescription(reason: string): string | null {
  const match = reason.match(/(\d+)[-\s]day(?:s)?\s+(?:shooting\s+)?streak/i);
  if (match) return `${match[1]} Day Shooting Streak`;
  if (/streak/i.test(reason) && reason.length < 80) return cleanReason(reason);
  return null;
}

function extractHomeworkAssignmentName(reason: string): string | null {
  const patterns = [
    /homework(?:\s+completed)?:\s*(.+)$/i,
    /assignment:\s*(.+)$/i,
    /^(.+)\s+homework$/i,
  ];
  for (const pattern of patterns) {
    const match = reason.match(pattern);
    if (match?.[1]) return cleanReason(match[1]);
  }
  if (/homework/i.test(reason) && reason.length < 80) return cleanReason(reason);
  return null;
}

function resolveZoomMeetingDisplayFallback(reason: string): string {
  const cleaned = cleanReason(reason);
  if (!cleaned) return "Zoom meeting";
  if (
    /^(zoom attendance|zoom meeting attendance|attended(?:\s+via|\s+in|\s+the)?|watched|recording|replay|in person|live)\b/i.test(
      cleaned,
    )
  ) {
    return "Zoom meeting";
  }
  if (/\battended via\b|\bzoom recording\b|\bmeeting attendance\b/i.test(cleaned)) {
    return "Zoom meeting";
  }
  if (cleaned.length > 120) return "Zoom meeting";
  return cleaned;
}

function resolveZoomMeetingSubline(row: XpEventSummary): string {
  const linked = row.zoomMeetingDisplayName?.trim();
  if (linked) return linked;
  return resolveZoomMeetingDisplayFallback(asText(row.reasonPublic, ""));
}

function manualBonusDetail(reason: string): string | null {
  const cleaned = cleanReason(reason);
  if (!cleaned || /^manual bonus$/i.test(cleaned)) return null;
  return cleaned;
}

/** Display date for row 2 — ISO YYYY-MM-DD, never prefixed with "Date:". */
export function formatGameLogDisplayDate(dateKey: string | null | undefined): string {
  if (!dateKey || !String(dateKey).trim()) return "Date TBD";
  const trimmed = String(dateKey).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return trimmed;
}

/** Parent-facing Extra Credit note for the Game Log date row. */
export function formatGameLogExtraCreditTagline(
  extraCreditXp: number | null | undefined,
): string | null {
  if (extraCreditXp == null || !Number.isFinite(extraCreditXp) || extraCreditXp <= 0) {
    return null;
  }
  return `Extra credit +${formatXp(extraCreditXp)} XP`;
}

/** Combine ISO date and optional tagline for row 2 left (non-Zoom layout). */
export function formatGameLogDateLine(
  dateKey: string | null | undefined,
  dateTagline?: string | null,
): string {
  const date = formatGameLogDisplayDate(dateKey);
  const tag = dateTagline?.trim();
  return tag ? `${date} · ${tag}` : date;
}

/** Map XP event source + reason into short Game Log headlines (FUT-012). */
export function formatGameLogPresentation(row: XpEventSummary): GameLogPresentation {
  const source = asText(row.sourceLabel, "").toLowerCase();
  const reason = cleanReason(asText(row.reasonPublic, ""));

  if (source.includes("video")) {
    const fileName =
      row.videoDisplayFileName?.trim() ||
      resolveVideoDisplayFileNameWithFallback(row.videoCustomFileName, row.videoOriginalFileName);
    return {
      headline: joinHeadline("Video Submission", fileName),
    };
  }

  if (source.includes("submission") || source.includes("shooting base") || /shooting submission/i.test(reason)) {
    const linkedShots = row.submissionTotalShots;
    const shots =
      linkedShots != null && linkedShots > 0
        ? linkedShots
        : extractShotCount(reason);
    return {
      headline: joinHeadline(
        "Shot Submission",
        shots != null && shots > 0 ? `${formatShots(shots)} shots` : null,
      ),
    };
  }

  if (source.includes("weekly threshold") || /weekly shot goal/i.test(reason)) {
    return {
      headline: joinHeadline(
        "Weekly Shot Target",
        extractWeeklyTargetPercent(asText(row.sourceLabel, ""), reason),
      ),
    };
  }

  if (source.includes("milestone") || /milestone|threshold/i.test(reason)) {
    return {
      headline: joinHeadline(
        "Milestone Achieved",
        extractMilestonePercent(asText(row.sourceLabel, ""), reason),
      ),
    };
  }

  if (source.includes("manual bonus") || /manual bonus/i.test(reason)) {
    return {
      headline: joinHeadline("Manual Bonus", manualBonusDetail(reason)),
    };
  }

  if (source.includes("streak") || /streak/i.test(reason)) {
    return {
      headline: joinHeadline("Streak", extractStreakDescription(reason) ?? (reason || null)),
    };
  }

  if (source.includes("zoom")) {
    return {
      headline: "Zoom Meeting Attendance",
      subline: resolveZoomMeetingSubline(row),
      dateOnSecondRowRight: true,
    };
  }

  if (source.includes("homework")) {
    const assignmentTitle =
      row.homeworkAssignmentTitle?.trim() ||
      extractHomeworkAssignmentName(reason);
    return {
      headline: joinHeadline("Homework Completed", assignmentTitle),
      dateTagline: formatGameLogExtraCreditTagline(row.homeworkExtraCreditXp),
    };
  }

  if (source.includes("perfect week")) {
    return {
      headline: joinHeadline("Perfect Week", reason || "Week requirements met"),
    };
  }

  if (source.includes("achievement")) {
    return {
      headline: joinHeadline("Achievement", reason || null),
    };
  }

  const fallbackTitle =
    reason && reason !== "—"
      ? reason
      : row.sourceLabel
        ? formatXpSourceLabel(row.sourceLabel)
        : "XP earned";

  return {
    headline: fallbackTitle,
  };
}
