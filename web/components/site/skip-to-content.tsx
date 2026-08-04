/**
 * Keyboard-first skip link — jumps past sticky header chrome into main content.
 */
export function SkipToContent({
  targetId = "main-content",
  label = "Skip to main content",
}: {
  targetId?: string;
  label?: string;
}) {
  return (
    <a href={`#${targetId}`} className="skip-to-content">
      {label}
    </a>
  );
}
