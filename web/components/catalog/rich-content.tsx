import type { ReactNode } from "react";

import { parseInlineMarkdown, splitRichTextBlocks } from "@/lib/formatters/rich-text";

type RichContentProps = {
  text: string;
  className?: string;
};

function renderInline(text: string): ReactNode[] {
  return parseInlineMarkdown(text).map((part, index) => {
    const key = `${part.type}-${index}-${part.value.slice(0, 24)}`;

    if (part.type === "bold") {
      return (
        <strong key={key} className="font-semibold text-foreground">
          {part.value}
        </strong>
      );
    }

    if (part.type === "italic") {
      return (
        <em key={key} className="italic">
          {part.value}
        </em>
      );
    }

    if (part.type === "link") {
      return (
        <a
          key={key}
          href={part.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent-soft underline-offset-2 hover:underline"
        >
          {part.value}
        </a>
      );
    }

    return <span key={key}>{part.value}</span>;
  });
}

export function RichContent({ text, className = "" }: RichContentProps) {
  const blocks = splitRichTextBlocks(text);
  if (blocks.length === 0) return null;

  return (
    <div className={`space-y-4 text-sm leading-relaxed text-muted sm:text-base ${className}`}>
      {blocks.map((block) => (
        <p key={block.slice(0, 48)} className="whitespace-pre-wrap">
          {renderInline(block)}
        </p>
      ))}
    </div>
  );
}
