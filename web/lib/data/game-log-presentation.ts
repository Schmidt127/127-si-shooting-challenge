import { asText } from "@/lib/data/airtable-values";
import { formatXpSourceLabel } from "@/lib/formatters";
import type { XpEventSummary } from "@/types/xp";

export type GameLogPresentation = {
  title: string;
  detail: string | null;
};

function cleanReason(reason: string): string {
  return reason.replace(/\.\s*$/, "").trim();
}

function extractShotCount(reason: string): number | null {
  const match = reason.match(/(\d[\d,]*)\s+shots?\b/i);
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractPercentGoal(reason: string): string | null {
  const match = reason.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?(?:target\s+)?goal/i);
  if (match) return `${match[1]}% of Target Goal`;
  const generic = reason.match(/(\d+(?:\.\d+)?)\s*%/);
  if (generic) return `${generic[1]}% of Target Goal`;
  return null;
}

function extractStreakDays(reason: string): number | null {
  const match = reason.match(/(\d+)[-\s]day(?:s)?\s+(?:shooting\s+)?streak/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractHomeworkName(reason: string): string | null {
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

/** Map XP event source + reason into short Game Log labels (FUT-012). */
export function formatGameLogPresentation(row: XpEventSummary): GameLogPresentation {
  const source = asText(row.sourceLabel, "").toLowerCase();
  const reason = cleanReason(asText(row.reasonPublic, ""));

  if (source.includes("submission") || /shooting submission/i.test(reason)) {
    const shots = extractShotCount(reason);
    return {
      title: "Shot Submission",
      detail: shots != null ? `${shots} shots` : null,
    };
  }

  if (source.includes("milestone") || /milestone|threshold/i.test(reason)) {
    return {
      title: "Shot Milestone",
      detail: extractPercentGoal(reason) ?? (reason || null),
    };
  }

  if (source.includes("streak") || /streak/i.test(reason)) {
    const days = extractStreakDays(reason);
    return {
      title: "Streak",
      detail: days != null ? `${days} Day Shooting Streak` : reason || null,
    };
  }

  if (source.includes("zoom")) {
    return {
      title: "Zoom",
      detail: zoomAttendanceDetail(reason),
    };
  }

  if (source.includes("homework")) {
    return {
      title: "Homework",
      detail: extractHomeworkName(reason),
    };
  }

  if (source.includes("perfect week")) {
    return {
      title: "Perfect Week",
      detail: reason || "Week requirements met",
    };
  }

  if (source.includes("video")) {
    return {
      title: "Video Submission",
      detail: reason || null,
    };
  }

  if (source.includes("achievement")) {
    return {
      title: "Achievement",
      detail: reason || null,
    };
  }

  const fallbackTitle =
    reason && reason !== "—"
      ? reason
      : row.sourceLabel
        ? formatXpSourceLabel(row.sourceLabel)
        : "XP earned";

  return {
    title: fallbackTitle,
    detail: null,
  };
}
