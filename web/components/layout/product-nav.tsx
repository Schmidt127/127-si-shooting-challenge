"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ChevronDownIcon, MenuIcon, XIcon } from "lucide-react";

import type { ProductNavItem } from "@/components/layout/product-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { splitNavItems } from "@/lib/navigation/nav-priority";
import {
  DAILY_SUBMISSIONS,
  PLAYER_REGISTRATION,
} from "@/lib/registration";
import { ACCESSIBILITY_LABELS } from "@/lib/release/public-surface";
import { cn } from "@/lib/utils";

type ProductNavProps = {
  productName: string;
  items: ProductNavItem[];
};

function pathMatches(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(active: boolean) {
  return cn(
    "inline-flex min-h-11 shrink-0 items-center rounded-md px-3.5 py-2.5 text-[0.9375rem] font-semibold transition",
    active
      ? "bg-brand-blue text-brand-white shadow-site-sm ring-1 ring-brand-orange/45"
      : "text-foreground hover:bg-brand-light-gray hover:text-foreground",
  );
}

function navLandmarkLabel(productName: string) {
  return productName.trim().toLowerCase() === "shooting challenge"
    ? `${ACCESSIBILITY_LABELS.productNav} navigation`
    : `${productName} navigation`;
}

export function ProductNav({ productName, items }: ProductNavProps) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { primary, resources, more } = splitNavItems(items);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuId = useId();
  const panelId = `${menuId}-panel`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const openMobile = useCallback(() => {
    setMobileOpen(true);
  }, []);

  // Close on route change
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  // Escape + body scroll lock + focus management while open
  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = triggerRef.current;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobile();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // Prefer close control first so keyboard users can dismiss immediately.
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [mobileOpen, closeMobile]);

  if (items.length === 0) return null;

  const moreActive = more.some((item) => pathMatches(pathname, item.href));
  const resourcesActive = resources.some((item) => pathMatches(pathname, item.href));
  const allItems = [...primary, ...resources, ...more];
  const landmark = navLandmarkLabel(productName);

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {/* Desktop / tablet navigation */}
      <nav
        className="hidden items-center gap-2 md:flex md:flex-wrap"
        aria-label={landmark}
      >
        <p className="sr-only">
          Primary links stay visible. Resources and additional sections are in dropdown menus.
        </p>
        {primary.map((item) => {
          const active = pathMatches(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={navLinkClass(active)}
            >
              {item.label}
            </Link>
          );
        })}

        {resources.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(navLinkClass(resourcesActive), "gap-1")}
              data-active={resourcesActive || undefined}
              aria-label="Resources navigation"
            >
              Resources
              <ChevronDownIcon className="size-4 opacity-80" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              {resources.map((item) => {
                const active = pathMatches(pathname, item.href);
                return (
                  <DropdownMenuItem
                    key={item.href}
                    className={cn(
                      "min-h-11 cursor-pointer text-[0.9375rem] font-medium",
                      active ? "bg-brand-blue/10 text-brand-blue" : null,
                    )}
                    onClick={() => router.push(item.href)}
                  >
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {more.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(navLinkClass(moreActive), "gap-1")}
              data-active={moreActive || undefined}
              aria-label={ACCESSIBILITY_LABELS.moreNav}
            >
              More
              <ChevronDownIcon className="size-4 opacity-80" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              {more.map((item) => {
                const active = pathMatches(pathname, item.href);
                return (
                  <DropdownMenuItem
                    key={item.href}
                    className={cn(
                      "min-h-11 cursor-pointer text-[0.9375rem] font-medium",
                      active ? "bg-brand-blue/10 text-brand-blue" : null,
                    )}
                    onClick={() => router.push(item.href)}
                  >
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </nav>

      {/* Mobile menu control */}
      <div className="md:hidden">
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            navLinkClass(mobileOpen),
            "inline-flex w-full min-h-11 items-center justify-center gap-2",
          )}
          aria-expanded={mobileOpen}
          aria-controls={panelId}
          aria-haspopup="dialog"
          aria-label={
            mobileOpen
              ? ACCESSIBILITY_LABELS.mobileMenuClose
              : ACCESSIBILITY_LABELS.mobileMenuOpen
          }
          data-testid="mobile-nav-toggle"
          onClick={() => (mobileOpen ? closeMobile() : openMobile())}
        >
          {mobileOpen ? (
            <XIcon className="size-5" aria-hidden />
          ) : (
            <MenuIcon className="size-5" aria-hidden />
          )}
          <span aria-hidden>{mobileOpen ? "Close menu" : "Menu"}</span>
        </button>
      </div>

      {/* Mobile navigation dialog */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-brand-charcoal/45"
            aria-label="Close navigation menu"
            onClick={closeMobile}
          />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label={ACCESSIBILITY_LABELS.mobileMenuDialog}
            data-testid="mobile-nav-panel"
            className="absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col border-b border-border bg-card shadow-site-lg"
            onKeyDown={trapFocus}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="text-sm font-bold text-foreground">{productName}</p>
              <button
                ref={closeButtonRef}
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-foreground hover:bg-brand-light-gray"
                aria-label={ACCESSIBILITY_LABELS.mobileMenuClose}
                data-testid="mobile-nav-close"
                onClick={closeMobile}
              >
                <XIcon className="size-5" aria-hidden />
              </button>
            </div>

            <div className="space-y-2 border-b border-border px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-soft">
                Join or submit
              </p>
              <a
                href={PLAYER_REGISTRATION.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${PLAYER_REGISTRATION.cta} (opens in a new tab)`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-brand-blue px-4 text-sm font-semibold text-brand-white"
                onClick={closeMobile}
              >
                {PLAYER_REGISTRATION.cta}
              </a>
              <a
                href={DAILY_SUBMISSIONS.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${DAILY_SUBMISSIONS.cta} (opens in a new tab)`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-brand-orange bg-brand-orange px-4 text-sm font-semibold text-brand-charcoal"
                onClick={closeMobile}
              >
                {DAILY_SUBMISSIONS.cta}
              </a>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label={landmark}>
              <ul className="flex flex-col gap-1">
                {allItems.map((item) => {
                  const active = pathMatches(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(navLinkClass(active), "w-full")}
                        onClick={closeMobile}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
