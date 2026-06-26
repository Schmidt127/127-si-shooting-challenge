import { LANDING_URL } from "@/lib/app-config";

export function BackToHubLink() {
  return (
    <a
      href={LANDING_URL}
      className="group inline-flex items-center gap-2 text-sm text-muted transition hover:text-accent-soft"
    >
      <span className="text-accent-soft transition group-hover:-translate-x-0.5" aria-hidden>
        ←
      </span>
      Home
    </a>
  );
}
