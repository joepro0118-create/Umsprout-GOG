"use client";

import {
  API_BASE,
  ComplianceResult,
  ExtractedRequirement,
  formatCategory,
  formatDateTime,
} from "@/lib/types";
import { ArrowUpRightIcon, ChevronDownIcon, ChevronRightIcon } from "./Icons";
import { ResolveForm } from "./ResolveForm";
import { StatusBadge } from "./StatusBadge";
import { TierBadge } from "./TierBadge";

interface RequirementRowProps {
  tenderId: string;
  requirement: ExtractedRequirement;
  result: ComplianceResult;
  lowQualityPages: number[];
  defaultAttester: string;
  expanded: boolean;
  onToggle: () => void;
  onResolved: (updated: ComplianceResult) => void;
}

export function RequirementRow({
  tenderId,
  requirement,
  result,
  lowQualityPages,
  defaultAttester,
  expanded,
  onToggle,
  onResolved,
}: RequirementRowProps) {
  const page = requirement.source_page;
  const pageUrl =
    page !== null ? `${API_BASE}/api/tenders/${tenderId}/pdf#page=${page}` : null;
  const isScannedPage = page !== null && lowQualityPages.includes(page);

  const comparisonText =
    result.comparison?.expression !== undefined &&
    result.comparison?.expression !== null
      ? String(result.comparison.expression)
      : result.comparison?.reason !== undefined &&
          result.comparison?.reason !== null
        ? String(result.comparison.reason)
        : null;

  const isGap = result.status === "gap";
  const rowBgStyle =
    isGap && expanded
      ? { backgroundColor: "var(--tm-gap-row)" }
      : expanded
        ? { backgroundColor: "var(--tm-surface-subtle)" }
        : { backgroundColor: "var(--tm-surface)" };

  return (
    <div
      style={rowBgStyle}
      className="border-b border-[var(--tm-border)] last:border-b-0"
    >
      {/* Desktop (>=768px) Table Row Header */}
      <div className="hidden md:grid md:grid-cols-[152px_minmax(0,1fr)_168px_80px_76px] md:items-center md:gap-4 px-5 py-3 transition-colors duration-150 hover:bg-[var(--tm-hover)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${requirement.id}`}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--tm-text-muted)] transition-colors duration-150 hover:bg-[var(--tm-hover)] hover:text-[var(--tm-text-primary)]"
          >
            {expanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
          <StatusBadge status={result.status} />
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="min-w-0 flex items-center gap-2 text-left group"
        >
          <span
            className={`truncate text-sm transition-colors duration-150 group-hover:text-[var(--tm-accent)] ${
              isGap || result.status === "needs_review"
                ? "font-medium text-[var(--tm-text-primary)]"
                : "font-normal text-[var(--tm-text-secondary)]"
            }`}
            title={requirement.explanation}
          >
            {requirement.explanation}
          </span>
          {isScannedPage && (
            <span className="shrink-0 inline-flex items-center rounded-[4px] border border-[var(--tm-border)] bg-[var(--tm-raised)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--tm-text-secondary)]">
              OCR
            </span>
          )}
        </button>

        {/* Quiet plain secondary text for category */}
        <div className="min-w-0 truncate text-[13px] text-[var(--tm-text-secondary)]">
          {formatCategory(requirement.category)}
        </div>

        {/* Signature archival folio citation */}
        <div className="whitespace-nowrap">
          {pageUrl ? (
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 rounded-[4px] px-1.5 py-0.5 -ml-1.5 font-mono text-xs font-medium text-[var(--tm-accent)] transition-colors duration-150 hover:bg-[var(--tm-accent-soft)] hover:text-[var(--tm-accent-hover)]"
            >
              <span>p.{page}</span>
              <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="inline-flex items-center rounded-[4px] border border-[var(--tm-gap-border)] bg-[var(--tm-gap-soft)] px-1.5 py-0.5 font-mono text-xs font-medium text-[var(--tm-gap-text)]">
              Uncited
            </span>
          )}
        </div>

        <div className="whitespace-nowrap">
          <TierBadge isDisqualifying={result.is_disqualifying} />
        </div>
      </div>

      {/* Mobile (<768px) Stacked Row Header */}
      <div className="md:hidden px-4 py-3 space-y-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="w-full text-left space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {expanded ? (
                <ChevronDownIcon className="h-4 w-4 text-[var(--tm-text-muted)]" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-[var(--tm-text-muted)]" />
              )}
              <StatusBadge status={result.status} />
            </div>
            <TierBadge isDisqualifying={result.is_disqualifying} />
          </div>
          <p className="text-sm font-medium text-[var(--tm-text-primary)] line-clamp-2">
            {requirement.explanation}
          </p>
        </button>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--tm-text-secondary)]">
          <span>{formatCategory(requirement.category)}</span>
          {pageUrl ? (
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-mono font-medium text-[var(--tm-accent)] hover:underline"
            >
              <span>p.{page}</span>
              <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="inline-flex items-center rounded-[4px] border border-[var(--tm-gap-border)] bg-[var(--tm-gap-soft)] px-1.5 py-0.5 font-mono font-medium text-[var(--tm-gap-text)]">
              Uncited
            </span>
          )}
          {isScannedPage && (
            <span className="inline-flex items-center rounded-[4px] border border-[var(--tm-border)] bg-[var(--tm-raised)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--tm-text-secondary)]">
              OCR
            </span>
          )}
        </div>
      </div>

      {/* Expanded Archival Dossier Drawer */}
      {expanded && (
        <div className="tm-drawer-enter border-t border-[var(--tm-border-subtle)] px-4 py-5 md:pl-[188px] md:pr-6 space-y-4">
          {/* Verbatim original_text quote block — NEVER translate or paraphrase */}
          <div
            style={{
              borderLeftColor: isGap
                ? "var(--tm-gap)"
                : "var(--tm-clause-rule)",
            }}
            className="rounded-r-[10px] border border-[var(--tm-border)] border-l-2 bg-[var(--tm-surface)] px-4 py-3 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-[var(--tm-text-muted)]">
              <span>Original tender clause</span>
              <span className="font-mono">{requirement.id}</span>
            </div>
            <blockquote className="text-sm text-[var(--tm-text-primary)] leading-relaxed">
              {requirement.original_text}
            </blockquote>
          </div>

          {/* Validation flags (visible tags) */}
          {requirement.validation_flags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--tm-text-muted)]">
                Validation flags
              </span>
              {requirement.validation_flags.map((flag) => (
                <span
                  key={flag}
                  className="inline-flex items-center rounded-[4px] border border-[var(--tm-review-border)] bg-[var(--tm-review-soft)] px-2 py-0.5 font-mono text-xs text-[var(--tm-review-text)] break-words"
                >
                  {flag}
                </span>
              ))}
            </div>
          )}

          {/* Gap and Rule-checked audit trail */}
          {(result.status === "gap" ||
            result.status === "matched_rule_verified") && (
            <div className="space-y-3 pt-1">
              <dl className="grid grid-cols-1 gap-y-2 text-[13px] sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-x-4">
                <dt className="text-xs text-[var(--tm-text-muted)] sm:pt-0.5">
                  Rule
                </dt>
                <dd className="font-mono text-xs text-[var(--tm-text-primary)] break-words">
                  {result.rule_id || "—"}
                </dd>

                <dt className="text-xs text-[var(--tm-text-muted)] sm:pt-0.5">
                  Comparison
                </dt>
                <dd className="font-mono text-xs text-[var(--tm-text-primary)] break-words">
                  {comparisonText || "—"}
                </dd>

                <dt className="text-xs text-[var(--tm-text-muted)] sm:pt-0.5">
                  Evidence
                </dt>
                <dd className="text-[13px] text-[var(--tm-text-primary)] break-words">
                  {result.company_evidence ? (
                    <span>
                      {result.company_evidence.title}{" "}
                      <span className="text-[var(--tm-text-muted)]">·</span>{" "}
                      <span className="font-mono text-xs text-[var(--tm-text-secondary)] break-words">
                        {result.company_evidence.filename}
                      </span>
                    </span>
                  ) : result.missing_evidence_marker ? (
                    <span className="font-medium text-[var(--tm-gap-text)]">
                      Missing evidence — {result.missing_evidence_marker.reason}
                    </span>
                  ) : (
                    <span className="text-[var(--tm-text-muted)]">—</span>
                  )}
                </dd>
              </dl>

              {isGap && (
                <p className="text-xs text-[var(--tm-text-muted)]">
                  Gaps come from deterministic rules and cannot be overridden
                </p>
              )}
            </div>
          )}

          {/* Needs review: Mark as satisfied form */}
          {result.status === "needs_review" && (
            <ResolveForm
              tenderId={tenderId}
              requirementId={requirement.id}
              defaultAttester={defaultAttester}
              onResolved={onResolved}
            />
          )}

          {/* User-evidenced attestation details */}
          {result.status === "matched_user_evidenced" &&
            result.user_resolution && (
              <div className="rounded-[10px] border border-dashed border-[var(--tm-accent-border)] bg-[var(--tm-accent-soft)] p-4 space-y-3 text-[13px]">
                <p className="text-xs font-medium text-[var(--tm-accent)]">
                  User attestation with attached evidence (not rule-verified)
                </p>
                <dl className="grid grid-cols-1 gap-y-2 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-x-4">
                  <dt className="text-xs text-[var(--tm-text-secondary)] sm:pt-0.5">
                    Evidence
                  </dt>
                  <dd className="min-w-0">
                    <a
                      href={`${API_BASE}/api/tenders/${tenderId}/evidence/${result.user_resolution.evidence_document_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs font-medium text-[var(--tm-accent)] hover:underline break-words"
                    >
                      <span className="break-words">
                        {result.user_resolution.evidence_document_id} ·{" "}
                        {result.user_resolution.evidence_filename}
                      </span>
                      <ArrowUpRightIcon className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </dd>

                  <dt className="text-xs text-[var(--tm-text-secondary)] sm:pt-0.5">
                    Attested by
                  </dt>
                  <dd className="text-[var(--tm-text-primary)]">
                    {result.user_resolution.attested_by}
                  </dd>

                  <dt className="text-xs text-[var(--tm-text-secondary)] sm:pt-0.5">
                    Attested at
                  </dt>
                  <dd className="font-mono text-xs text-[var(--tm-text-primary)]">
                    {formatDateTime(result.user_resolution.attested_at)}
                  </dd>

                  {result.user_resolution.note && (
                    <>
                      <dt className="text-xs text-[var(--tm-text-secondary)] sm:pt-0.5">
                        Note
                      </dt>
                      <dd className="text-[var(--tm-text-primary)] break-words">
                        {result.user_resolution.note}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            )}

          {/* Not applicable details */}
          {result.status === "not_applicable" && (
            <p className="text-[13px] text-[var(--tm-text-secondary)]">
              {result.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
