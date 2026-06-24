import { ProductShell } from "@/components/layout/product-shell";
import { getProductById } from "@/lib/products";

export default function DribblingChallengeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const product = getProductById("dribbling-challenge");

  return (
    <ProductShell
      productName={product?.name ?? "Dribbling Challenge"}
      productLabel="Program"
      navItems={[{ label: "Overview", href: "/dribbling-challenge" }]}
    >
      {children}
    </ProductShell>
  );
}
