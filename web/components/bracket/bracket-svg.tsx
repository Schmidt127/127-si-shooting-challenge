type BracketSvgProps = {
  svg: string;
  title: string;
};

export function BracketSvg({ svg, title }: BracketSvgProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-card/40">
      <div
        className="min-w-max p-2"
        role="img"
        aria-label={title}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
