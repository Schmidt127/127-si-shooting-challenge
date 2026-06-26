import { getJrRefAirtableConfigStatus } from "@/lib/jr-ref/airtable";
import { JR_REF_AIRTABLE_BASE_NAME } from "@/lib/jr-ref/config";

type JrRefSectionPlaceholderProps = {
  title: string;
  description: string;
  tableHint: string;
};

export function JrRefSectionPlaceholder({
  title,
  description,
  tableHint,
}: JrRefSectionPlaceholderProps) {
  const airtable = getJrRefAirtableConfigStatus();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">Coming next</p>
      <h2 className="mt-4 text-2xl font-bold text-foreground">{title}</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted">{description}</p>

      <div className="mt-8 rounded-2xl border border-white/[0.08] bg-card/40 p-5 text-sm">
        <p className="font-medium text-foreground">Airtable wiring</p>
        <ul className="mt-3 space-y-2 text-muted">
          <li>
            Base: <span className="text-foreground/90">{JR_REF_AIRTABLE_BASE_NAME}</span>
          </li>
          <li>
            Table: <code className="rounded bg-white/5 px-1.5 py-0.5">{tableHint}</code>
          </li>
          <li>
            Env:{" "}
            <code className="rounded bg-white/5 px-1.5 py-0.5">JR_REF_AIRTABLE_BASE_ID</code>{" "}
            {airtable.configured ? (
              <span className="text-brand-orange">configured</span>
            ) : (
              <span className="text-muted-subtle">not set yet</span>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
