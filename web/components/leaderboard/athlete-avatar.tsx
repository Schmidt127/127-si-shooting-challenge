import Image from "next/image";

type AthleteAvatarProps = {
  name: string;
  headshotUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  ringClass?: string;
  rank?: number;
};

const sizes = {
  sm: { box: "h-9 w-9", text: "text-xs", px: 36 },
  md: { box: "h-11 w-11", text: "text-sm", px: 44 },
  lg: { box: "h-16 w-16", text: "text-lg", px: 64 },
  xl: { box: "h-28 w-28 sm:h-36 sm:w-36", text: "text-3xl sm:text-4xl", px: 144 },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function AthleteAvatar({
  name,
  headshotUrl,
  size = "md",
  ringClass = "ring-white/15",
  rank,
}: AthleteAvatarProps) {
  const s = sizes[size];

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-blue/30 to-accent/20 ring-2 ${ringClass} ${s.box}`}
    >
      {headshotUrl ? (
        <Image
          src={headshotUrl}
          alt={name}
          fill
          className="object-cover"
          sizes={`${s.px}px`}
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-black text-white/85">
          <span className={s.text}>{initials(name)}</span>
        </div>
      )}
      {rank === 1 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-court-gold text-[10px] font-black text-brand-charcoal shadow-lg">
          1
        </span>
      ) : null}
    </div>
  );
}
