"use client";

import { LevelBadge } from "@/components/leaderboard/level-badge";
import { LevelCoverImage, type LevelCoverImageSize } from "@/components/levels/level-cover-image";
import { getLevelStyle } from "@/lib/leaderboard/level-styles";
import { getLevelCoverAssetSources } from "@/lib/levels/level-cover-assets";
import {
  getLevelGraphicAltText,
  getLevelGraphicPlaceholderLabel,
} from "@/lib/levels/level-graphic";
import { cn } from "@/lib/utils";

type LevelGraphicSize = "sm" | "md" | "lg";

type LevelGraphicProps = {
  level: string;
  coverImageUrl?: string | null;
  sortOrder?: number;
  size?: LevelGraphicSize;
  className?: string;
};

const frameSizeClasses: Record<LevelGraphicSize, string> = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-11 w-11 rounded-xl",
  lg: "h-16 w-16 rounded-2xl",
};

const placeholderTextClasses: Record<LevelGraphicSize, string> = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

const graphicSizeMap: Record<LevelGraphicSize, LevelCoverImageSize> = {
  sm: "graphic-sm",
  md: "graphic-md",
  lg: "graphic-lg",
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
 * Level cover art from permanent repo assets, with a brand-gradient placeholder when missing.
 */
export function LevelGraphic({
  level,
  coverImageUrl,
  sortOrder,
  size = "md",
  className,
}: LevelGraphicProps) {
  const trimmedLevel = level.trim();
  const placeholder = (
    <LevelGraphicPlaceholder level={trimmedLevel || "Unranked"} size={size} className={className} />
  );

  if (!trimmedLevel) {
    return placeholder;
  }

  const sources = getLevelCoverAssetSources(trimmedLevel, sortOrder);
  if (!sources) {
    void coverImageUrl;
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
      <LevelCoverImage
        levelName={trimmedLevel}
        displayName={trimmedLevel}
        sortOrder={sortOrder}
        size={graphicSizeMap[size]}
        className="h-full w-full"
      />
    </div>
  );
}

type AthleteLevelDisplayProps = {
  level: string | null;
  coverImageUrl?: string | null;
  sortOrder?: number;
  badgeSize?: "sm" | "md" | "lg";
  graphicSize?: LevelGraphicSize;
  className?: string;
};

/**
 * Graphic + badge treatment for public athlete profiles.
 */
export function AthleteLevelDisplay({
  level,
  coverImageUrl,
  sortOrder,
  badgeSize = "md",
  graphicSize = "md",
  className,
}: AthleteLevelDisplayProps) {
  if (!level?.trim()) return null;

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid="athlete-level-display">
      <LevelGraphic
        level={level}
        coverImageUrl={coverImageUrl}
        sortOrder={sortOrder}
        size={graphicSize}
      />
      <LevelBadge level={level} size={badgeSize} />
    </div>
  );
}
