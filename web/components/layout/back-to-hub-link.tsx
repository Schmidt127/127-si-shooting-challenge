import { LANDING_URL } from "@/lib/app-config";

export function BackToHubLink() {
  return (
    <a
      href={LANDING_URL}
      className="group inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg px-1 text-sm font-medium text-muted transition hover:text-accent-soft"
    >
      <span className="text-brand-orange transition group-hover:-translate-x-0.5" aria-hidden>
        ←
      </span>
      Home
    </a>
  );
}
