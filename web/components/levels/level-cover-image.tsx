import Image from "next/image";

import {
  getLevelCoverAltText,
  getLevelCoverAssetSources,
} from "@/lib/levels/level-cover-assets";
import { cn } from "@/lib/utils";

export type LevelCoverImageSize = "card" | "hero" | "graphic-sm" | "graphic-md" | "graphic-lg";

type LevelCoverImageProps = {
  levelName: string;
  displayName?: string;
  sortOrder?: number;
  size?: LevelCoverImageSize;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

const SIZE_CONFIG: Record<
  LevelCoverImageSize,
  { width: number; height: number; sizes: string; className: string }
> = {
  "graphic-sm": {
    width: 36,
    height: 36,
    sizes: "36px",
    className: "max-h-7 max-w-9",
  },
  "graphic-md": {
    width: 56,
    height: 44,
    sizes: "56px",
    className: "max-h-10 max-w-14",
  },
  "graphic-lg": {
    width: 80,
    height: 64,
    sizes: "80px",
    className: "max-h-14 max-w-20",
  },
  card: {
    width: 144,
    height: 112,
    sizes: "(max-width: 640px) 96px, 128px",
    className: "max-h-24 max-w-32 sm:max-h-28 sm:max-w-36",
  },
  hero: {
    width: 512,
    height: 384,
    sizes: "(max-width: 640px) 280px, 480px",
    className: "max-h-72 w-auto max-w-full sm:max-h-96",
  },
};

/**
 * Permanent level cover art from repo assets (`public/images/levels/`).
 * Serves WebP when available with PNG fallback; PNG masters remain in repo.
 */
export function LevelCoverImage({
  levelName,
  displayName = "",
  sortOrder,
  size = "card",
  className = "",
  imageClassName = "",
  priority = false,
}: LevelCoverImageProps) {
  const sources = getLevelCoverAssetSources(levelName, sortOrder);
  if (!sources) return null;

  const config = SIZE_CONFIG[size];
  const alt = getLevelCoverAltText(displayName, levelName);

  return (
    <picture className={cn("block leading-none", className)}>
      <source srcSet={sources.webp} type="image/webp" />
      <Image
        src={sources.png}
        alt={alt}
        width={config.width}
        height={config.height}
        sizes={config.sizes}
        priority={priority}
        unoptimized
        className={cn("object-contain", config.className, imageClassName)}
      />
    </picture>
  );
}
