import Image from "next/image";

import {
  getLevelCoverAltText,
  getLevelCoverAssetSrc,
} from "@/lib/levels/level-cover-assets";
import { cn } from "@/lib/utils";

type LevelCoverImageSize = "card" | "hero";

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
  const src = getLevelCoverAssetSrc(levelName, sortOrder);
  if (!src) return null;

  const config = SIZE_CONFIG[size];
  const alt = getLevelCoverAltText(displayName, levelName);

  return (
    <Image
      src={src}
      alt={alt}
      width={config.width}
      height={config.height}
      sizes={config.sizes}
      priority={priority}
      unoptimized
      className={cn("object-contain", config.className, imageClassName)}
    />
  );
}
