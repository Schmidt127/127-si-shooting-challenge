import { ProductShell } from "@/components/layout/product-shell";
import { getProductById } from "@/lib/products";

export default function RefereeClinicsLayout({ children }: { children: React.ReactNode }) {
  const product = getProductById("referee-clinics");

  return (
    <ProductShell
      productName={product?.name ?? "Referee Clinics"}
      productLabel="Program"
      navItems={[{ label: "Overview", href: "/referee-clinics" }]}
    >
      {children}
    </ProductShell>
  );
}
