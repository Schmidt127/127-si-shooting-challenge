import { JsonLd } from "@/components/seo/json-ld";
import {
  buildDetailRouteJsonLd,
  type CatalogSeoSection,
} from "@/lib/seo/structured-data";

type DetailStructuredDataProps = {
  section: CatalogSeoSection;
  itemName: string;
  itemDescription: string;
  itemPath: string;
};

/** WebPage + BreadcrumbList JSON-LD for published catalog detail routes. */
export function DetailStructuredData({
  section,
  itemName,
  itemDescription,
  itemPath,
}: DetailStructuredDataProps) {
  return (
    <JsonLd
      data={buildDetailRouteJsonLd({
        section,
        itemName,
        itemDescription,
        itemPath,
      })}
    />
  );
}
