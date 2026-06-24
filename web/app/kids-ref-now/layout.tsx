import { ProductShell } from "@/components/layout/product-shell";
import { getProductById } from "@/lib/products";

export default function KidsRefNowLayout({ children }: { children: React.ReactNode }) {
  const product = getProductById("kids-ref-now");

  return (
    <ProductShell
      productName={product?.name ?? "Kids Ref Now"}
      productLabel="Program"
      navItems={[{ label: "Overview", href: "/kids-ref-now" }]}
    >
      {children}
    </ProductShell>
  );
}
