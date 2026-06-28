import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, className = "", ...props }: IconProps) {
  return { width: size, height: size, viewBox: "0 0 24 24", fill: "none", className, ...props };
}

export function IconTrophy(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <path
        d="M6 4h12v2a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 20h8M10 14v6M14 14v6M4 6H2v1a3 3 0 0 0 3 3M20 6h2v1a3 3 0 0 1-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconCrown(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <path
        d="M4 18h16l-2-9-4 4-2-6-2 6-4-4-2 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M4 18v2h16v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconTarget(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <path
        d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLevel(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <path
        d="M4 18 12 4l8 14H4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8.5 14h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <path
        d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2V4Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M5 18h13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" />
    </svg>
  );
}

export function IconMegaphone(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <path
        d="M4 10v4h4l6 4V6L8 10H4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M18 8a4 4 0 0 1 0 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconBasketball(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRank(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-8M22 20V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconMedal(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <circle cx="12" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.5 11 6 20l6-3 6 3-2.5-9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconNews(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <path d="M6 4h12v16H6V4Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconVideoCall(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <rect x="3" y="7" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="m16 10 5-3v10l-5-3v-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function IconScroll(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <path
        d="M8 4h8a2 2 0 0 1 2 2v14H8a2 2 0 0 0-2 2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M10 9h6M10 13h6M10 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconMonitor(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
