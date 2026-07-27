/** Split Airtable rich text / long copy into paragraphs for display. */
export function splitRichTextBlocks(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  return trimmed
    .split(/\n{2,}/)
    .map((block) => normalizeRichTextBlock(block))
    .filter(Boolean);
}

/** Soften common Markdown heading markers from Airtable long-text fields. */
export function normalizeRichTextBlock(block: string): string {
  return block
    .trim()
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ");
}

export type RichInlinePart =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "link"; value: string; href: string };

const INLINE_TOKEN =
  /(\*\*([^*]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g;

/**
 * Parse a small, safe Markdown subset used in Airtable long-text fields.
 * Does not interpret HTML — unknown markup stays as plain text.
 */
/** Flatten Markdown markers for single-line card previews. */
export function plainTextFromRichText(text: string): string {
  return parseInlineMarkdown(normalizeRichTextBlock(text))
    .map((part) => part.value)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseInlineMarkdown(text: string): RichInlinePart[] {
  if (!text) return [];

  const parts: RichInlinePart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_TOKEN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) });
    }

    if (match[2]) {
      parts.push({ type: "bold", value: match[2] });
    } else if (match[3]) {
      parts.push({ type: "italic", value: match[3] });
    } else if (match[4]) {
      parts.push({ type: "italic", value: match[4] });
    } else if (match[5] && match[6]) {
      parts.push({ type: "link", value: match[5], href: match[6] });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", value: text }];
}
