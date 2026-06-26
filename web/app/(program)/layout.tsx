import { ProductShell } from "@/components/layout/product-shell";
import { SHOOTING_CHALLENGE_NAV } from "@/lib/navigation/shooting-challenge-nav";
import { SHOOTING_CHALLENGE } from "@/lib/app-config";

export default function ShootingProgramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProductShell
      productName={SHOOTING_CHALLENGE.name}
      productLabel="Program"
      navItems={SHOOTING_CHALLENGE_NAV}
    >
      {children}
    </ProductShell>
  );
}
