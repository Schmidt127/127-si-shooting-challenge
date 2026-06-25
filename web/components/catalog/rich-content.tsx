import { splitRichTextBlocks } from "@/lib/formatters/rich-text";

type RichContentProps = {
  text: string;
  className?: string;
};

export function RichContent({ text, className = "" }: RichContentProps) {
  const blocks = splitRichTextBlocks(text);
  if (blocks.length === 0) return null;

  return (
    <div className={`space-y-4 text-sm leading-relaxed text-muted sm:text-base ${className}`}>
      {blocks.map((block) => (
        <p key={block.slice(0, 48)} className="whitespace-pre-wrap">
          {block}
        </p>
      ))}
    </div>
  );
}
