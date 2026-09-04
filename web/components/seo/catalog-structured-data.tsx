import { JsonLd } from "@/components/seo/json-ld";
import {
  buildCatalogRouteJsonLd,
  type CatalogSeoSection,
} from "@/lib/seo/structured-data";

type CatalogStructuredDataProps = {
  section: CatalogSeoSection;
};

/** CollectionPage + BreadcrumbList JSON-LD for public catalog routes. */
export function CatalogStructuredData({ section }: CatalogStructuredDataProps) {
  return <JsonLd data={buildCatalogRouteJsonLd(section)} />;
}
