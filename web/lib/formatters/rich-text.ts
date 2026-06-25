/** Split Airtable rich text / long copy into paragraphs for display. */
export function splitRichTextBlocks(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  return trimmed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}
