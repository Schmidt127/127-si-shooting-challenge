import type { AnchorSide, BracketLayoutDefinition } from "./layout-definition";
import { BRACKET_THEME } from "./theme";
import type { BracketMatch, BracketTheme, MatchFields } from "./types";
import { volleyballLayout } from "./layouts/volleyball";

type Point = [number, number];

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function shortName(link: MatchFields["Team A"]): string {
  if (!link) return "";
  if (Array.isArray(link) && link.length > 0) {
    const first = link[0];
    if (typeof first === "object" && first && "name" in first) {
      return String(first.name ?? "");
    }
  }
  return "";
}

function winnerSel(fields: MatchFields): string | null {
  const winner = fields.Winner;
  if (winner && typeof winner === "object" && "name" in winner) {
    return winner.name ?? null;
  }
  if (typeof winner === "string") return winner;
  return null;
}

function parseAirtableIso(iso: string): Date {
  const normalized = iso.replace("Z", "+00:00");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${iso}`);
  }
  return date;
}

function formatTime(iso: string | undefined, timeZone: string): string {
  if (!iso) return "";
  try {
    const date = parseAirtableIso(iso);
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
    return formatted.replace(/\s0(\d:)/, " $1");
  } catch {
    return "";
  }
}

function anchor(
  x: number,
  y: number,
  side: AnchorSide,
  cardW: number,
  cardH: number,
): Point {
  const midX = x + cardW / 2;
  const midY = y + cardH / 2;
  switch (side) {
    case "right":
      return [x + cardW, midY];
    case "left":
      return [x, midY];
    case "top":
      return [midX, y];
    case "bottom":
      return [midX, y + cardH];
    default:
      return [x, midY];
  }
}

function elbowPath(start: Point, end: Point): string {
  const [x1, y1] = start;
  const [x2, y2] = end;
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`;
}

function lineEl(
  start: Point,
  end: Point,
  theme: BracketTheme,
  dashed: boolean,
): string {
  const dash = dashed ? ' stroke-dasharray="8,6"' : "";
  return `<line x1="${start[0]}" y1="${start[1]}" x2="${end[0]}" y2="${end[1]}" fill="none" stroke="${theme.accent}" stroke-width="2"${dash} />`;
}

function pathEl(d: string, theme: BracketTheme, dashed: boolean): string {
  const dash = dashed ? ' stroke-dasharray="8,6"' : "";
  return `<path d="${d}" fill="none" stroke="${theme.accent}" stroke-width="2"${dash} />`;
}

function drawCard(
  theme: BracketTheme,
  layout: BracketLayoutDefinition,
  key: string,
  fields: MatchFields,
  x: number,
  y: number,
): string {
  const { cardW, cardH, cardRadius, boxPad } = layout;
  const teamA = shortName(fields["Team A"]) || "(TBD)";
  const teamB = shortName(fields["Team B"]) || "";
  const timeZone = process.env.BRACKET_TZ?.trim() || "America/Denver";
  const timeStr = formatTime(fields["Scheduled Time"], timeZone);
  const gameNo = fields["Game #"];
  const winner = winnerSel(fields);
  const titleLeft = gameNo ? `Game ${gameNo} — ${key}` : key;

  const aFill = winner === "Team A" ? theme.winner : theme.text;
  const bFill = winner === "Team B" ? theme.winner : theme.text;
  const aWeight = winner === "Team A" ? 700 : 500;
  const bWeight = winner === "Team B" ? 700 : 500;

  const external = layout.externalMeta;

  if (external) {
    const metaTitlePx = layout.metaTitlePx ?? 10;
    const metaTimePx = layout.metaTimePx ?? 9;
    const lineH = layout.metaLineH ?? 11;
    const gap = 3;
    const boxStroke = theme.accent;
    const metaLines: string[] = [];
    if (external === "above") {
      const timeY = y - gap;
      const titleY = timeStr ? timeY - lineH : timeY;
      metaLines.push(
        `<text x="${x}" y="${titleY}" fill="${theme.muted}" style="font: 600 ${metaTitlePx}px ${theme.font_family};">${esc(titleLeft)}</text>`,
      );
      if (timeStr) {
        metaLines.push(
          `<text x="${x}" y="${timeY}" fill="${theme.muted}" style="font: 500 ${metaTimePx}px ${theme.font_family};">${esc(timeStr)}</text>`,
        );
      }
    } else {
      const titleY = y + cardH + gap + lineH;
      const timeY = titleY + lineH;
      metaLines.push(
        `<text x="${x}" y="${titleY}" fill="${theme.muted}" style="font: 600 ${metaTitlePx}px ${theme.font_family};">${esc(titleLeft)}</text>`,
      );
      if (timeStr) {
        metaLines.push(
          `<text x="${x}" y="${timeY}" fill="${theme.muted}" style="font: 500 ${metaTimePx}px ${theme.font_family};">${esc(timeStr)}</text>`,
        );
      }
    }
    return `
    ${metaLines.join("\n")}
    <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="${cardRadius}" ry="${cardRadius}" fill="${theme.card_fill}" stroke="${boxStroke}" stroke-width="2.25" />
    <line x1="${x + 10}" y1="${y + cardH / 2}" x2="${x + cardW - 10}" y2="${y + cardH / 2}" stroke="${theme.card_stroke}" stroke-width="1" />
    <text x="${x + 8}" y="${y + 22}" fill="${aFill}" style="font: ${aWeight} 13px ${theme.font_family};">${esc(teamA)}</text>
    <text x="${x + 8}" y="${y + cardH - 10}" fill="${bFill}" style="font: ${bWeight} 13px ${theme.font_family};">${esc(teamB)}</text>
  `;
  }

  const bx = x - boxPad;
  const by = y - boxPad;
  const bw = cardW + boxPad * 2;
  const bh = cardH + boxPad * 2;
  const boxStroke = boxPad > 0 ? theme.accent : theme.card_stroke;
  const boxWidth = boxPad > 0 ? 2.25 : 1.5;
  const meta = gameNo ? `Game ${gameNo}` : key;
  const subtitle = gameNo ? key : "";

  return `
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${cardRadius + 4}" ry="${cardRadius + 4}" fill="none" stroke="${boxStroke}" stroke-width="${boxWidth}" />
    <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="${cardRadius}" ry="${cardRadius}" fill="${theme.card_fill}" stroke="${theme.card_stroke}" stroke-width="1.25" />
    <text x="${x + 12}" y="${y + 20}" fill="${theme.muted}" style="font: 600 13px ${theme.font_family};">${esc(meta)}</text>
    ${subtitle ? `<text x="${x + 12}" y="${y + 34}" fill="${theme.muted}" style="font: 500 11px ${theme.font_family}; opacity:.85">${esc(subtitle)}</text>` : ""}
    <text x="${x + cardW - 12}" y="${y + 20}" fill="${theme.muted}" text-anchor="end" style="font: 500 11px ${theme.font_family};">${esc(timeStr)}</text>
    <line x1="${x + 10}" y1="${y + 42}" x2="${x + cardW - 10}" y2="${y + 42}" stroke="${theme.card_stroke}" stroke-width="1" />
    <text x="${x + 12}" y="${y + 58}" fill="${aFill}" style="font: ${aWeight} 14px ${theme.font_family};">${esc(teamA)}</text>
    <text x="${x + 12}" y="${y + 76}" fill="${bFill}" style="font: ${bWeight} 14px ${theme.font_family};">${esc(teamB)}</text>
  `;
}

function drawConnectors(
  layout: BracketLayoutDefinition,
  positions: Record<string, [number, number]>,
  theme: BracketTheme,
): string {
  const parts: string[] = [];
  const { cardW, cardH } = layout;

  for (const conn of layout.connectors) {
    const fromPos = positions[conn.from];
    const toPos = positions[conn.to];
    if (!fromPos || !toPos) continue;

    const start = anchor(fromPos[0], fromPos[1], conn.fromSide, cardW, cardH);
    const end = anchor(toPos[0], toPos[1], conn.toSide, cardW, cardH);
    const dashed = conn.dashed ?? false;

    if (conn.corridorDrop) {
      const { corridorY } = conn.corridorDrop;
      const d = `M${start[0]},${start[1]} L${start[0]},${corridorY} L${end[0]},${corridorY} L${end[0]},${end[1]}`;
      parts.push(pathEl(d, theme, dashed));
    } else if (start[1] === end[1] || start[0] === end[0]) {
      parts.push(lineEl(start, end, theme, dashed));
    } else {
      parts.push(pathEl(elbowPath(start, end), theme, dashed));
    }
  }

  return parts.join("\n");
}

function formatUpdatedAt(timeZone: string): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
  return formatted.replace(/\s0(\d:)/, " $1");
}

export function renderBracketSvg(
  matches: BracketMatch[],
  tournamentName: string,
  theme: BracketTheme = BRACKET_THEME,
  layout: BracketLayoutDefinition = volleyballLayout,
): string {
  const timeZone = process.env.BRACKET_TZ?.trim() || "America/Denver";
  const byKey = new Map<string, BracketMatch>();
  for (const match of matches) {
    const key = match.fields["Match Key"];
    if (key) byKey.set(String(key), match);
  }

  const cards: string[] = [];
  for (const key of layout.order) {
    const pos = layout.layout[key];
    if (!pos) continue;
    const [x, y] = pos;
    const fields = byKey.get(key)?.fields ?? {};
    cards.push(drawCard(theme, layout, key, fields, x, y));
  }

  const labels: string[] = [];
  if (layout.losersLabel) {
    labels.push(
      `<text x="${layout.losersLabel.x}" y="${layout.losersLabel.y}" fill="${theme.muted}" style="font: 600 13px ${theme.font_family}; letter-spacing:.3px">${esc(layout.losersLabel.text)}</text>`,
    );
  }
  if (layout.winnersLabel) {
    labels.push(
      `<text x="${layout.winnersLabel.x}" y="${layout.winnersLabel.y}" fill="${theme.muted}" style="font: 600 13px ${theme.font_family}; letter-spacing:.3px">${esc(layout.winnersLabel.text)}</text>`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}">
  <rect width="${layout.width}" height="${layout.height}" fill="${theme.bg}" />
  <text x="${layout.padding}" y="44" fill="${theme.text}" style="font: 700 26px ${theme.font_family}; letter-spacing:.2px">${esc(tournamentName)}</text>
  <text x="${layout.padding}" y="72" fill="${theme.muted}" style="font: 400 14px ${theme.font_family};">Updated at: ${esc(formatUpdatedAt(timeZone))}</text>
  ${labels.join("\n")}
  ${drawConnectors(layout, layout.layout, theme)}
  ${cards.join("\n")}
</svg>`;
}
