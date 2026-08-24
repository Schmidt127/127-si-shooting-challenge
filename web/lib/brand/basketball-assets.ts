/** Photorealistic 3D basketball — local branding assets under /public/images/branding/. */

export const BASKETBALL_GRAPHIC_ALT = "Photorealistic 3D basketball" as const;

export const BASKETBALL_GRAPHIC = {
  master: "/images/branding/basketball-3d-master.png",
  default: "/images/branding/basketball-3d.webp",
  small: "/images/branding/basketball-3d-small.webp",
} as const;

/** Intrinsic dimensions of optimized WebP derivatives (square, aspect preserved). */
export const BASKETBALL_GRAPHIC_DIMENSIONS = {
  default: { width: 512, height: 512 },
  small: { width: 256, height: 256 },
} as const;
