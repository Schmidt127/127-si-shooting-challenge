import { ProductShell } from "@/components/layout/product-shell";
import { JR_REFEREE_CLINICS_NAV } from "@/lib/navigation/jr-referee-clinics-nav";
import { getProductById } from "@/lib/products";

export default function JrRefereeClinicsLayout({ children }: { children: React.ReactNode }) {
  const product = getProductById("jr-referee-clinics");

  return (
    <ProductShell
      productName={product?.name ?? "JR Referee Clinics"}
      productLabel="Program"
      navItems={JR_REFEREE_CLINICS_NAV}
    >
      {children}
    </ProductShell>
  );
}
