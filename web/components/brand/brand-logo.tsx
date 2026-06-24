import { BRAND_LOGOS, BRAND_ORG_NAME } from "@/lib/brand";

type BrandLogoVariant = "horizontal" | "circle";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
};

const SIZES: Record<BrandLogoVariant, { width: number; height: number }> = {
  horizontal: { width: 420, height: 120 },
  circle: { width: 56, height: 56 },
};

export function BrandLogo({
  variant = "horizontal",
  className = "",
  priority = false,
}: BrandLogoProps) {
  const { width, height } = SIZES[variant];
  const src = variant === "circle" ? BRAND_LOGOS.circle : BRAND_LOGOS.horizontal;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={BRAND_ORG_NAME}
      width={width}
      height={height}
      className={className}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
