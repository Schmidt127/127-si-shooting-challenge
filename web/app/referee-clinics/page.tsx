import type { Metadata } from "next";

import { getProductById } from "@/lib/products";

const product = getProductById("referee-clinics");

export const metadata: Metadata = {
  title: product?.name ?? "Referee Clinics",
  description: product?.description,
};

export default function RefereeClinicsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">Coming Soon</p>
      <h2 className="mt-4 text-2xl font-bold text-foreground">Building the officiating hub</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted">{product?.description}</p>
      <p className="mt-8 text-sm text-muted">
        Referee Clinics pages will ship here incrementally — separate navigation, same Hoop
        Challenges home.
      </p>
    </div>
  );
}
