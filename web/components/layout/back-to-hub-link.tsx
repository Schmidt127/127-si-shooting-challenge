import Link from "next/link";

export function BackToHubLink() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2 text-sm text-muted transition hover:text-accent-soft"
    >
      <span
        className="text-accent-soft transition group-hover:-translate-x-0.5"
        aria-hidden
      >
        ←
      </span>
      All Programs
    </Link>
  );
}
