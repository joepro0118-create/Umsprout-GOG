"use client";

import { ComplianceSummary, TenderMeta, formatDateShort } from "@/lib/types";

interface TenderListProps {
  tenders: TenderMeta[];
  summaries: Record<string, ComplianceSummary>;
  dismissedIds: Set<string>;
  loading: boolean;
  onSelect: (id: string) => void;
  onDismiss: (id: string) => void;
}

function TenderStatusPill({ status }: { status: TenderMeta["status"] }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-md bg-[#E7F6EC] px-2 py-0.5 text-[11.5px] font-semibold text-[#05603A] whitespace-nowrap">
        Completed
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center rounded-md bg-[#EFF4FF] px-2 py-0.5 text-[11.5px] font-semibold text-[#1D4ED8] whitespace-nowrap">
        Processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-[#FEE4E2] px-2 py-0.5 text-[11.5px] font-semibold text-[#912018] whitespace-nowrap">
      Failed
    </span>
  );
}

export function TenderList({
  tenders,
  summaries,
  dismissedIds,
  loading,
  onSelect,
  onDismiss,
}: TenderListProps) {
  const visibleTenders = tenders.filter((t) => !dismissedIds.has(t.id));

  return (
    <aside className="tm-card overflow-hidden">
      <div className="border-b border-[#E4E7EC] px-5 py-4">
        <h2 className="text-[14px] font-semibold text-[#101828]">
          Recent analyses
        </h2>
      </div>

      {loading ? (
        <div
          className="divide-y divide-[#E4E7EC]"
          aria-busy="true"
          aria-label="Loading recent analyses"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-5 space-y-2.5 animate-pulse">
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-44 rounded bg-[#E4E7EC]" />
                <div className="h-5 w-16 rounded bg-[#E4E7EC]" />
              </div>
              <div className="h-3 w-36 rounded bg-[#F2F4F7]" />
              <div className="h-3 w-48 rounded bg-[#F2F4F7]" />
            </div>
          ))}
        </div>
      ) : visibleTenders.length === 0 ? (
        <div className="px-5 py-8 text-center text-[13px] text-[#667085]">
          No analyses yet. Upload a tender PDF to begin.
        </div>
      ) : (
        <ul className="divide-y divide-[#E4E7EC]" aria-live="polite">
          {visibleTenders.map((t) => {
            const summary = summaries[t.id];

            if (t.status === "failed") {
              return (
                <li key={t.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-[13.5px] text-[#101828] break-words">
                      {t.title}
                    </div>
                    <TenderStatusPill status="failed" />
                  </div>
                  <div className="font-mono text-[11.5px] text-[#667085] break-words">
                    {t.id} · {formatDateShort(t.created_at)}
                  </div>
                  <p className="text-[12.5px] text-[#667085] leading-relaxed break-words">
                    {t.error || "Analysis failed. Please upload a clearer PDF."}
                  </p>
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => onDismiss(t.id)}
                      className="text-[12.5px] font-medium text-[#667085] hover:text-[#101828] underline underline-offset-2"
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              );
            }

            if (t.status === "processing") {
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(t.id)}
                    className="w-full px-5 py-4 text-left transition-colors hover:bg-[#F9FAFB] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-[13.5px] text-[#101828] break-words">
                        {t.title}
                      </span>
                      <TenderStatusPill status="processing" />
                    </div>
                    <div className="font-mono text-[11.5px] text-[#667085] break-words">
                      {t.id} · {formatDateShort(t.created_at)}
                    </div>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-[#E4E7EC]"
                      role="progressbar"
                      aria-label={`Processing ${t.title}`}
                    >
                      <div className="h-full w-1/3 rounded-full bg-[#2457D6] tm-progress-indeterminate" />
                    </div>
                    <p className="text-[12.5px] text-[#667085]">
                      Reading pages and extracting requirements…
                    </p>
                  </button>
                </li>
              );
            }

            // Completed
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className="w-full px-5 py-4 text-left transition-colors hover:bg-[#F9FAFB] space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-[13.5px] text-[#101828] break-words">
                      {t.title}
                    </span>
                    <TenderStatusPill status="completed" />
                  </div>
                  <div className="font-mono text-[11.5px] text-[#667085] break-words">
                    {t.id} · {formatDateShort(t.completed_at || t.created_at)}
                  </div>
                  {summary && (
                    <p
                      className={`text-[12.5px] font-medium ${
                        summary.disqualifying_gaps > 0
                          ? "text-[#912018]"
                          : "text-[#667085]"
                      }`}
                    >
                      {summary.disqualifying_gaps}{" "}
                      {summary.disqualifying_gaps === 1
                        ? "disqualifying gap"
                        : "disqualifying gaps"}{" "}
                      · {summary.needs_review} need review
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
