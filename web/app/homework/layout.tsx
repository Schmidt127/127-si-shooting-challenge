import { ProductShell } from "@/components/layout/product-shell";
import { SHOOTING_CHALLENGE_NAV } from "@/lib/navigation/shooting-challenge-nav";
import { getProductById } from "@/lib/products";

export default function HomeworkLayout({ children }: { children: React.ReactNode }) {
  const product = getProductById("shooting-challenge");

  return (
    <ProductShell
      productName={product?.name ?? "Shooting Challenge"}
      productLabel="Program"
      navItems={SHOOTING_CHALLENGE_NAV}
    >
      {children}
    </ProductShell>
  );
}
