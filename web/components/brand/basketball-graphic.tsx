import Image from "next/image";

import { withBasePath } from "@/lib/app-config";
import {
  BASKETBALL_GRAPHIC,
  BASKETBALL_GRAPHIC_ALT,
  BASKETBALL_GRAPHIC_DIMENSIONS,
} from "@/lib/brand/basketball-assets";
import { cn } from "@/lib/utils";

type BasketballGraphicSize = "sm" | "md" | "lg";

type BasketballGraphicProps = {
  size?: BasketballGraphicSize;
  className?: string;
  priority?: boolean;
};

const DISPLAY_SIZES: Record<
  BasketballGraphicSize,
  { width: number; height: number; src: string; sizes: string }
> = {
  sm: {
    ...BASKETBALL_GRAPHIC_DIMENSIONS.small,
    src: BASKETBALL_GRAPHIC.small,
    sizes: "96px",
  },
  md: {
    ...BASKETBALL_GRAPHIC_DIMENSIONS.default,
    src: BASKETBALL_GRAPHIC.default,
    sizes: "(max-width: 640px) 128px, 192px",
  },
  lg: {
    ...BASKETBALL_GRAPHIC_DIMENSIONS.default,
    src: BASKETBALL_GRAPHIC.default,
    sizes: "(max-width: 640px) 160px, 240px",
  },
};

/**
 * Responsive photorealistic basketball graphic with transparent WebP derivatives.
 * Uses explicit width/height to prevent layout shift.
 */
export function BasketballGraphic({
  size = "md",
  className = "",
  priority = false,
}: BasketballGraphicProps) {
  const display = DISPLAY_SIZES[size];
  const smallSrc = withBasePath(BASKETBALL_GRAPHIC.small);
  const defaultSrc = withBasePath(BASKETBALL_GRAPHIC.default);

  return (
    <picture className={cn("block leading-none", className)}>
      <source media="(max-width: 640px)" srcSet={smallSrc} type="image/webp" />
      <Image
        src={defaultSrc}
        alt={BASKETBALL_GRAPHIC_ALT}
        width={display.width}
        height={display.height}
        sizes={display.sizes}
        priority={priority}
        unoptimized
        className="h-full w-full object-contain"
      />
    </picture>
  );
}
