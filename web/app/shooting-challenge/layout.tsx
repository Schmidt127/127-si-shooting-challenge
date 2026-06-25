import { ProductShell } from "@/components/layout/product-shell";
import { getProductById } from "@/lib/products";

const SHOOTING_NAV = [
  { label: "Overview", href: "/shooting-challenge" },
  { label: "Leaderboard", href: "/shooting-challenge/leaderboard" },
  { label: "Levels", href: "/levels" },
  { label: "Achievements", href: "/achievements" },
  { label: "Display", href: "/public-display" },
] as const;

export default function ShootingChallengeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const product = getProductById("shooting-challenge");

  return (
    <ProductShell
      productName={product?.name ?? "Shooting Challenge"}
      productLabel="Program"
      navItems={[...SHOOTING_NAV]}
    >
      {children}
    </ProductShell>
  );
}
