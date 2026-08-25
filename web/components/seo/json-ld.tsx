type JsonLdProps = {
  data: Record<string, unknown>;
};

/** Renders schema.org JSON-LD without exposing private participant fields. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
