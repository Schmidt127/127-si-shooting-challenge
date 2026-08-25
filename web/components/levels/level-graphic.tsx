"use client";

import { SafeExternalImage } from "@/components/media/safe-external-image";
import { LevelBadge } from "@/components/leaderboard/level-badge";
import { getLevelStyle } from "@/lib/leaderboard/level-styles";
import {
  getLevelGraphicAltText,
  getLevelGraphicPlaceholderLabel,
} from "@/lib/levels/level-graphic";
import { cn } from "@/lib/utils";

type LevelGraphicSize = "sm" | "md" | "lg";

type LevelGraphicProps = {
  level: string;
  coverImageUrl?: string | null;
  size?: LevelGraphicSize;
  className?: string;
};

const frameSizeClasses: Record<LevelGraphicSize, string> = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-11 w-11 rounded-xl",
  lg: "h-16 w-16 rounded-2xl",
};

const imageSizeClasses: Record<LevelGraphicSize, string> = {
  sm: "max-h-7 max-w-9",
  md: "max-h-10 max-w-14",
  lg: "max-h-14 max-w-20",
};

const placeholderTextClasses: Record<LevelGraphicSize, string> = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

function LevelGraphicPlaceholder({
  level,
  size,
  className,
}: {
  level: string;
  size: LevelGraphicSize;
  className?: string;
}) {
  const style = getLevelStyle(level);
  const alt = getLevelGraphicAltText(level || style.label);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br font-mono font-black ring-1",
        frameSizeClasses[size],
        placeholderTextClasses[size],
        style.gradient,
        style.text,
        style.ring,
        className,
      )}
      role="img"
      aria-label={alt}
      data-testid="level-graphic"
    >
      {getLevelGraphicPlaceholderLabel(level || style.label)}
    </div>
  );
}

/**
 * Level cover art from Airtable, with a brand-gradient placeholder when missing or expired.
 */
export function LevelGraphic({
  level,
  coverImageUrl,
  size = "md",
  className,
}: LevelGraphicProps) {
  const trimmedLevel = level.trim();
  const alt = getLevelGraphicAltText(trimmedLevel);
  const placeholder = (
    <LevelGraphicPlaceholder level={trimmedLevel || "Unranked"} size={size} className={className} />
  );

  if (!trimmedLevel) {
    return placeholder;
  }

  if (!coverImageUrl?.trim()) {
    return placeholder;
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center border border-border-subtle bg-brand-light-gray p-1",
        frameSizeClasses[size],
        className,
      )}
      data-testid="level-graphic"
    >
      <SafeExternalImage
        src={coverImageUrl}
        alt={alt}
        className={cn("object-contain", imageSizeClasses[size])}
        fallback={placeholder}
      />
    </div>
  );
}

type AthleteLevelDisplayProps = {
  level: string | null;
  coverImageUrl?: string | null;
  badgeSize?: "sm" | "md" | "lg";
  graphicSize?: LevelGraphicSize;
  badgeVariant?: "default" | "hero";
  className?: string;
};

/**
 * Graphic + badge treatment for public athlete profiles.
 */
export function AthleteLevelDisplay({
  level,
  coverImageUrl,
  badgeSize = "md",
  graphicSize = "md",
  badgeVariant = "default",
  className,
}: AthleteLevelDisplayProps) {
  if (!level?.trim()) return null;

  return (
    <div className={cn("flex items-center gap-2.5", className)} data-testid="athlete-level-display">
      <LevelGraphic
        level={level}
        coverImageUrl={coverImageUrl}
        size={graphicSize}
        className={badgeVariant === "hero" ? "border-white/25 bg-white/10" : undefined}
      />
      <LevelBadge level={level} size={badgeSize} variant={badgeVariant} />
    </div>
  );
}
