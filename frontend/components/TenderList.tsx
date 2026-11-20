"use client";

import { ComplianceSummary, TenderMeta, formatDateShort } from "@/lib/types";
import { ChevronRightIcon } from "./Icons";

interface TenderListProps {
  tenders: TenderMeta[];
  summaries: Record<string, ComplianceSummary>;
  dismissedIds: Set<string>;
  loading: boolean;
  onSelect: (id: string) => void;
  onDismiss: (id: string) => void;
}

function TenderStatusLabel({ status }: { status: TenderMeta["status"] }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--tm-text-secondary)] whitespace-nowrap">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[var(--tm-rule)]"
          aria-hidden="true"
        />
        <span>Completed</span>
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--tm-accent)] whitespace-nowrap">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[var(--tm-accent)]"
          aria-hidden="true"
        />
        <span>Processing</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--tm-gap-text)] whitespace-nowrap">
      <span
        className="h-1.5 w-1.5 rounded-full bg-[var(--tm-gap)]"
        aria-hidden="true"
      />
      <span>Failed</span>
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
      <div className="flex items-center justify-between border-b border-[var(--tm-border)] px-5 py-4">
        <h2 className="text-sm font-medium text-[var(--tm-text-primary)]">
          Recent analyses
        </h2>
        {!loading && visibleTenders.length > 0 && (
          <span className="font-mono text-xs text-[var(--tm-text-muted)]">
            {visibleTenders.length}
          </span>
        )}
      </div>

      {loading ? (
        <div
          className="divide-y divide-[var(--tm-border)]"
          aria-busy="true"
          aria-label="Loading recent analyses"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-5 space-y-2 animate-pulse">
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-44 rounded bg-[var(--tm-skeleton)]" />
                <div className="h-4 w-16 rounded bg-[var(--tm-skeleton-soft)]" />
              </div>
              <div className="h-3 w-36 rounded bg-[var(--tm-skeleton-soft)]" />
              <div className="h-3 w-48 rounded bg-[var(--tm-skeleton-soft)]" />
            </div>
          ))}
        </div>
      ) : visibleTenders.length === 0 ? (
        <div className="px-5 py-10 text-center text-[13px] text-[var(--tm-text-muted)]">
          No analyses yet · upload a tender PDF to begin
        </div>
      ) : (
        <ul className="divide-y divide-[var(--tm-border)]" aria-live="polite">
          {visibleTenders.map((t) => {
            const summary = summaries[t.id];

            if (t.status === "failed") {
              return (
                <li key={t.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-sm text-[var(--tm-text-primary)] break-words">
                      {t.title}
                    </div>
                    <TenderStatusLabel status="failed" />
                  </div>
                  <div className="font-mono text-xs text-[var(--tm-text-muted)] break-words">
                    {t.id} · {formatDateShort(t.created_at)}
                  </div>
                  <p className="text-xs text-[var(--tm-text-secondary)] leading-relaxed break-words">
                    {t.error || "Analysis failed. Please upload a clearer PDF."}
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => onDismiss(t.id)}
                      className="text-xs font-medium text-[var(--tm-text-secondary)] hover:text-[var(--tm-text-primary)] underline underline-offset-2"
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
                    className="w-full px-5 py-4 text-left transition-colors duration-150 hover:bg-[var(--tm-hover)] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-sm text-[var(--tm-text-primary)] break-words">
                        {t.title}
                      </span>
                      <TenderStatusLabel status="processing" />
                    </div>
                    <div className="font-mono text-xs text-[var(--tm-text-muted)] break-words">
                      {t.id} · {formatDateShort(t.created_at)}
                    </div>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--tm-raised)]"
                      role="progressbar"
                      aria-label={`Processing ${t.title}`}
                    >
                      <div className="h-full w-1/3 rounded-full bg-[var(--tm-accent)] tm-progress-indeterminate" />
                    </div>
                    <p className="text-xs text-[var(--tm-text-muted)]">
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
                  className="group flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition-colors duration-150 hover:bg-[var(--tm-hover)]"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-sm text-[var(--tm-text-primary)] group-hover:text-[var(--tm-accent)] transition-colors duration-150 break-words">
                        {t.title}
                      </span>
                      <TenderStatusLabel status="completed" />
                    </div>
                    <div className="font-mono text-xs text-[var(--tm-text-muted)] break-words">
                      {t.id} · {formatDateShort(t.completed_at || t.created_at)}
                    </div>
                    {summary && (
                      <p
                        className={`text-xs ${
                          summary.disqualifying_gaps > 0
                            ? "font-medium text-[var(--tm-gap-text)]"
                            : "text-[var(--tm-text-secondary)]"
                        }`}
                      >
                        {summary.disqualifying_gaps}{" "}
                        {summary.disqualifying_gaps === 1
                          ? "disqualifying gap"
                          : "disqualifying gaps"}{" "}
                        · {summary.needs_review} need review
                      </p>
                    )}
                  </div>
                  <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tm-text-muted)] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
