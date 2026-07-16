import Image from "next/image";

import { withBasePath } from "@/lib/app-config";
import { BRAND_LOGOS, BRAND_ORG_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoVariant = "horizontal" | "circle";

type BrandLogoProps = {
  /**
   * - `circle` — compact nav, footer stamp, favicon source
   * - `horizontal` — wide headers / footers
   * Stacked variant is not available in-repo; use horizontal centered or circle.
   */
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
  /** Override default org alt text when context needs a more specific label. */
  alt?: string;
};

const SIZES: Record<BrandLogoVariant, { width: number; height: number }> = {
  horizontal: { width: 420, height: 120 },
  circle: { width: 200, height: 200 },
};

/**
 * Official 127 Sports Intensity logos.
 * Do not stretch, recolor, filter, outline, crop, or distort.
 *
 * Local public files are served under basePath `/shoot`. With `unoptimized`,
 * next/image does not always rewrite string srcs, so we prefix explicitly.
 */
export function BrandLogo({
  variant = "horizontal",
  className = "",
  priority = false,
  alt = BRAND_ORG_NAME,
}: BrandLogoProps) {
  const { width, height } = SIZES[variant];
  const assetPath = variant === "circle" ? BRAND_LOGOS.circle : BRAND_LOGOS.horizontal;
  const src = withBasePath(assetPath);

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      unoptimized
      className={cn("object-contain", className)}
      sizes={
        variant === "circle"
          ? "(max-width: 640px) 48px, 56px"
          : "(max-width: 640px) 280px, 420px"
      }
    />
  );
}
