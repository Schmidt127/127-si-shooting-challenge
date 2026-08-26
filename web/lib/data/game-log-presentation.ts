import { asText } from "@/lib/data/airtable-values";
import { formatShots, formatXpSourceLabel } from "@/lib/formatters";
import type { XpEventSummary } from "@/types/xp";

export type GameLogPresentation = {
  /** Single-line activity label for row 1 (e.g. "Shot Submission — 1,250 shots"). */
  headline: string;
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

function zoomAttendanceDetail(reason: string): string | null {
  if (/recording|replay|watched/i.test(reason)) return "Attended via Recording";
  if (/in person|live|attended/i.test(reason)) return "Attended in Person";
  return cleanReason(reason) || null;
}

function manualBonusDetail(reason: string): string | null {
  const cleaned = cleanReason(reason);
  if (!cleaned || /^manual bonus$/i.test(cleaned)) return null;
  return cleaned;
}

/** Display date for row 2 — never prefixed with "Date:". */
export function formatGameLogDisplayDate(dateKey: string | null | undefined): string {
  if (!dateKey || !String(dateKey).trim()) return "Date TBD";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey).trim());
  if (match) {
    const [, year, month, day] = match;
    return `${month}/${day}/${year}`;
  }
  return String(dateKey).trim();
}

/** Map XP event source + reason into short Game Log headlines (FUT-012). */
export function formatGameLogPresentation(row: XpEventSummary): GameLogPresentation {
  const source = asText(row.sourceLabel, "").toLowerCase();
  const reason = cleanReason(asText(row.reasonPublic, ""));

  if (source.includes("submission") || source.includes("shooting base") || /shooting submission/i.test(reason)) {
    const shots = extractShotCount(reason);
    return {
      headline: joinHeadline(
        "Shot Submission",
        shots != null ? `${formatShots(shots)} shots` : null,
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
      headline: joinHeadline("Zoom Attendance", zoomAttendanceDetail(reason)),
    };
  }

  if (source.includes("homework")) {
    return {
      headline: joinHeadline("Homework Completed", extractHomeworkAssignmentName(reason)),
    };
  }

  if (source.includes("perfect week")) {
    return {
      headline: joinHeadline("Perfect Week", reason || "Week requirements met"),
    };
  }

  if (source.includes("video")) {
    return {
      headline: joinHeadline("Video Feedback", reason || null),
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
