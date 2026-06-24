import Image from "next/image";

import { BRAND_LOGOS, BRAND_ORG_NAME } from "@/lib/brand";

type BrandLogoVariant = "horizontal" | "circle";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
};

const SIZES: Record<BrandLogoVariant, { width: number; height: number }> = {
  horizontal: { width: 420, height: 120 },
  circle: { width: 200, height: 200 },
};

export function BrandLogo({
  variant = "horizontal",
  className = "",
  priority = false,
}: BrandLogoProps) {
  const { width, height } = SIZES[variant];
  const src = variant === "circle" ? BRAND_LOGOS.circle : BRAND_LOGOS.horizontal;

  return (
    <Image
      src={src}
      alt={BRAND_ORG_NAME}
      width={width}
      height={height}
      priority={priority}
      className={className}
      sizes={
        variant === "circle"
          ? "(max-width: 640px) 48px, 56px"
          : "(max-width: 640px) 280px, 420px"
      }
    />
  );
}
