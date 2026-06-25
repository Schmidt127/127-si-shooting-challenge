import { ProductShell } from "@/components/layout/product-shell";
import { getProductById } from "@/lib/products";

export default function TournamentBracketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const product = getProductById("tournament-brackets");

  return (
    <ProductShell
      productName={product?.name ?? "Tournament Brackets"}
      productLabel="Program"
      navItems={[{ label: "Bracket", href: "/tournament-brackets" }]}
    >
      {children}
    </ProductShell>
  );
}
