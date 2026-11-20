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

  const rowBg =
    result.status === "gap" && expanded ? "bg-[#FFF8F8]" : "bg-white";

  return (
    <div className={`border-b border-[#E4E7EC] last:border-b-0 ${rowBg}`}>
      {/* Desktop (>=768px) Table Row Header */}
      <div className="hidden md:grid md:grid-cols-[144px_minmax(0,1fr)_168px_76px_74px] md:items-center md:gap-3 px-4 py-3 hover:bg-[#F9FAFB]/70 transition-colors">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${requirement.id}`}
            className="text-[#667085] hover:text-[#101828] p-0.5 rounded"
          >
            {expanded ? (
              <ChevronDownIcon className="h-3.5 w-3.5" />
            ) : (
              <ChevronRightIcon className="h-3.5 w-3.5" />
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
            className={`truncate text-[13.5px] group-hover:text-[#2457D6] transition-colors ${
              result.status === "gap" || result.status === "needs_review"
                ? "font-semibold text-[#101828]"
                : "font-medium text-[#101828]"
            }`}
            title={requirement.explanation}
          >
            {requirement.explanation}
          </span>
          {isScannedPage && (
            <span className="shrink-0 inline-flex items-center rounded border border-[#E4E7EC] bg-[#F8FAFC] px-1.5 py-0.5 text-[11px] font-medium text-[#475467]">
              Scanned · OCR
            </span>
          )}
        </button>

        <div className="min-w-0">
          <span className="inline-flex max-w-full truncate rounded-md bg-[#F2F4F7] px-2 py-0.5 text-[12px] text-[#475467]">
            {formatCategory(requirement.category)}
          </span>
        </div>

        <div className="whitespace-nowrap">
          {pageUrl ? (
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-mono text-[12.5px] font-medium text-[#2457D6] hover:underline"
            >
              <span>p.{page}</span>
              <ArrowUpRightIcon className="h-3 w-3" />
            </a>
          ) : (
            <span className="inline-flex items-center rounded border border-[#FDA29B] bg-[#FEF3F2] px-1.5 py-0.5 text-[11.5px] font-semibold text-[#912018]">
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
          className="w-full text-left space-y-1.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {expanded ? (
                <ChevronDownIcon className="h-3.5 w-3.5 text-[#667085]" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5 text-[#667085]" />
              )}
              <StatusBadge status={result.status} />
            </div>
            <TierBadge isDisqualifying={result.is_disqualifying} />
          </div>
          <p className="text-[13.5px] font-semibold text-[#101828] line-clamp-2">
            {requirement.explanation}
          </p>
        </button>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="inline-flex rounded-md bg-[#F2F4F7] px-2 py-0.5 text-[#475467]">
            {formatCategory(requirement.category)}
          </span>
          {pageUrl ? (
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-mono font-medium text-[#2457D6] hover:underline"
            >
              <span>p.{page}</span>
              <ArrowUpRightIcon className="h-3 w-3" />
            </a>
          ) : (
            <span className="inline-flex items-center rounded border border-[#FDA29B] bg-[#FEF3F2] px-1.5 py-0.5 text-[11.5px] font-semibold text-[#912018]">
              Uncited
            </span>
          )}
          {isScannedPage && (
            <span className="inline-flex items-center rounded border border-[#E4E7EC] bg-[#F8FAFC] px-1.5 py-0.5 text-[11px] font-medium text-[#475467]">
              Scanned · OCR
            </span>
          )}
        </div>
      </div>

      {/* Expanded Drawer Content */}
      {expanded && (
        <div className="px-4 pb-5 pt-1 md:pl-[160px] md:pr-6 space-y-4">
          {/* Verbatim original_text quote block — NEVER translate or paraphrase */}
          <blockquote className="rounded-lg border border-[#E4E7EC] border-l-[3px] border-l-[#CBD5E1] bg-white px-4 py-3 text-[13.5px] text-[#101828] leading-relaxed">
            {requirement.original_text}
          </blockquote>

          {/* Validation flags (visible tags) */}
          {requirement.validation_flags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] font-medium text-[#667085] mr-1">
                Flags:
              </span>
              {requirement.validation_flags.map((flag) => (
                <span
                  key={flag}
                  className="inline-flex items-center rounded border border-[#FDE68A] bg-[#FEF9E7] px-2 py-0.5 font-mono text-[11.5px] font-medium text-[#7A2E0E] break-words"
                >
                  {flag}
                </span>
              ))}
            </div>
          )}

          {/* Gap and Rule-checked audit trail */}
          {(result.status === "gap" ||
            result.status === "matched_rule_verified") && (
            <div className="space-y-3">
              <dl className="grid grid-cols-1 gap-y-2 text-[12.5px] sm:grid-cols-[100px_minmax(0,1fr)] sm:gap-x-4">
                <dt className="text-[#667085] font-medium">Rule</dt>
                <dd className="font-mono text-[#101828] break-words">
                  {result.rule_id || "—"}
                </dd>

                <dt className="text-[#667085] font-medium">Comparison</dt>
                <dd className="font-mono text-[#101828] break-words">
                  {comparisonText || "—"}
                </dd>

                <dt className="text-[#667085] font-medium">Evidence</dt>
                <dd className="text-[#101828] break-words">
                  {result.company_evidence ? (
                    <span>
                      {result.company_evidence.title}{" "}
                      <span className="text-[#667085]">·</span>{" "}
                      <span className="font-mono text-[12px] text-[#475467] break-words">
                        {result.company_evidence.filename}
                      </span>
                    </span>
                  ) : result.missing_evidence_marker ? (
                    <span className="font-semibold text-[#C0261A]">
                      MISSING EVIDENCE — {result.missing_evidence_marker.reason}
                    </span>
                  ) : (
                    <span className="text-[#667085]">—</span>
                  )}
                </dd>
              </dl>

              {result.status === "gap" && (
                <p className="text-[12px] text-[#667085]">
                  Gaps come from rules and cannot be overridden.
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
              <div className="rounded-lg border border-dashed border-[#93C5FD] bg-[#EFF4FF]/60 p-4 space-y-2 text-[12.5px]">
                <p className="font-semibold text-[#1D4ED8]">
                  User attestation with attached evidence (not rule-verified)
                </p>
                <dl className="grid grid-cols-1 gap-y-1.5 sm:grid-cols-[100px_minmax(0,1fr)] sm:gap-x-4">
                  <dt className="text-[#475467] font-medium">Evidence</dt>
                  <dd className="min-w-0">
                    <a
                      href={`${API_BASE}/api/tenders/${tenderId}/evidence/${result.user_resolution.evidence_document_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[12px] font-medium text-[#1D4ED8] hover:underline break-words"
                    >
                      <span className="break-words">
                        {result.user_resolution.evidence_document_id} ·{" "}
                        {result.user_resolution.evidence_filename}
                      </span>
                      <ArrowUpRightIcon className="h-3 w-3 shrink-0" />
                    </a>
                  </dd>

                  <dt className="text-[#475467] font-medium">Attested by</dt>
                  <dd className="text-[#101828]">
                    {result.user_resolution.attested_by}
                  </dd>

                  <dt className="text-[#475467] font-medium">Attested at</dt>
                  <dd className="text-[#101828]">
                    {formatDateTime(result.user_resolution.attested_at)}
                  </dd>

                  {result.user_resolution.note && (
                    <>
                      <dt className="text-[#475467] font-medium">Note</dt>
                      <dd className="text-[#101828] break-words">
                        {result.user_resolution.note}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            )}

          {/* Not applicable details */}
          {result.status === "not_applicable" && (
            <p className="text-[12.5px] text-[#667085]">{result.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
