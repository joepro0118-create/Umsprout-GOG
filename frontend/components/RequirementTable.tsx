"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ComplianceAssessment,
  ComplianceResult,
  ComplianceStatus,
  ExtractedRequirement,
  STATUS_LABELS,
} from "@/lib/types";
import { ChevronDownIcon, ChevronRightIcon } from "./Icons";
import { RequirementRow } from "./RequirementRow";

type StatusTab = "all" | ComplianceStatus;

const SEVERITY_ORDER: Record<ComplianceStatus, number> = {
  gap: 0,
  needs_review: 1,
  matched_user_evidenced: 2,
  matched_rule_verified: 3,
  not_applicable: 4,
};

interface RequirementTableProps {
  tenderId: string;
  requirements: ExtractedRequirement[];
  assessment: ComplianceAssessment;
  lowQualityPages: number[];
  defaultAttester: string;
  onResolved: (updated: ComplianceResult) => void;
}

export function RequirementTable({
  tenderId,
  requirements,
  assessment,
  lowQualityPages,
  defaultAttester,
  onResolved,
}: RequirementTableProps) {
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [tierBOnly, setTierBOnly] = useState(false);
  const [showRuleChecked, setShowRuleChecked] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const reqById = useMemo(
    () => new Map(requirements.map((r) => [r.id, r])),
    [requirements]
  );

  // Sort by severity while preserving document order inside each group
  const sortedRows = useMemo(() => {
    const indexed = assessment.results
      .map((result, idx) => ({
        result,
        requirement: reqById.get(result.requirement_id),
        idx,
      }))
      .filter(
        (
          item
        ): item is {
          result: ComplianceResult;
          requirement: ExtractedRequirement;
          idx: number;
        } => Boolean(item.requirement)
      );

    indexed.sort((a, b) => {
      const diff =
        SEVERITY_ORDER[a.result.status] - SEVERITY_ORDER[b.result.status];
      return diff !== 0 ? diff : a.idx - b.idx;
    });

    return indexed;
  }, [assessment.results, reqById]);

  // Reset default expanded rows when switching tenders:
  // all Gap rows + the first Needs-review row start expanded.
  useEffect(() => {
    const initial = new Set<string>();
    let firstNeedsReviewFound = false;
    for (const row of sortedRows) {
      if (row.result.status === "gap") {
        initial.add(row.result.requirement_id);
      } else if (
        row.result.status === "needs_review" &&
        !firstNeedsReviewFound
      ) {
        initial.add(row.result.requirement_id);
        firstNeedsReviewFound = true;
      }
    }
    setExpandedIds(initial);
    setActiveTab("all");
    setTierBOnly(false);
    setShowRuleChecked(false);
    // Only reset when tenderId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId]);

  const toggleRow = (reqId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) {
        next.delete(reqId);
      } else {
        next.add(reqId);
      }
      return next;
    });
  };

  const tabs: { id: StatusTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: assessment.summary.total_requirements },
    { id: "gap", label: "Gaps", count: assessment.summary.gap },
    {
      id: "needs_review",
      label: STATUS_LABELS.needs_review,
      count: assessment.summary.needs_review,
    },
    {
      id: "matched_rule_verified",
      label: STATUS_LABELS.matched_rule_verified,
      count: assessment.summary.matched_rule_verified,
    },
    {
      id: "matched_user_evidenced",
      label: STATUS_LABELS.matched_user_evidenced,
      count: assessment.summary.matched_user_evidenced,
    },
  ];

  if (assessment.summary.not_applicable > 0) {
    tabs.push({
      id: "not_applicable",
      label: STATUS_LABELS.not_applicable,
      count: assessment.summary.not_applicable,
    });
  }

  const filteredRows = sortedRows.filter((row) => {
    if (activeTab !== "all" && row.result.status !== activeTab) return false;
    if (tierBOnly && !row.result.is_disqualifying) return false;
    return true;
  });

  const shouldCollapseRuleChecked =
    activeTab === "all" && !showRuleChecked;

  const nonRuleCheckedRows = shouldCollapseRuleChecked
    ? filteredRows.filter(
        (r) => r.result.status !== "matched_rule_verified"
      )
    : filteredRows;

  const collapsedRuleCheckedCount = shouldCollapseRuleChecked
    ? filteredRows.filter(
        (r) => r.result.status === "matched_rule_verified"
      ).length
    : 0;

  const visibleCount = nonRuleCheckedRows.length;
  const totalInScope = filteredRows.length;

  return (
    <section
      aria-label="Requirements table"
      className="tm-card overflow-hidden"
    >
      {/* Tabs + Tier B filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E7EC] px-4 pt-2">
        <div
          role="tablist"
          aria-label="Filter requirements by status"
          className="flex flex-wrap items-center gap-1 -mb-px"
        >
          {tabs.map((t) => {
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  isSelected
                    ? "border-[#2457D6] text-[#101828] font-semibold"
                    : "border-transparent text-[#667085] hover:text-[#101828]"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[11.5px] ${
                    isSelected
                      ? "bg-[#EFF4FF] text-[#2457D6] font-semibold"
                      : "bg-[#F2F4F7] text-[#667085]"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 pb-2 text-[13px] font-medium text-[#344054] select-none">
          <input
            type="checkbox"
            checked={tierBOnly}
            onChange={(e) => setTierBOnly(e.target.checked)}
            className="h-4 w-4 rounded border-[#D0D5DD] accent-[#2457D6]"
          />
          <span>Tier B only</span>
        </label>
      </div>

      {/* Desktop Column Headers */}
      <div className="hidden md:grid md:grid-cols-[144px_minmax(0,1fr)_168px_76px_74px] md:gap-3 border-b border-[#E4E7EC] bg-[#F9FAFB] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
        <div>Status</div>
        <div>Requirement</div>
        <div>Category</div>
        <div>Page</div>
        <div>Tier</div>
      </div>

      {/* Rows */}
      <div role="tabpanel" aria-label="Filtered requirements">
      {totalInScope === 0 ? (
        <div className="px-6 py-10 text-center text-[13.5px] text-[#667085]">
          No requirements match the current filter.
        </div>
      ) : (
        <div>
          {nonRuleCheckedRows.map(({ result, requirement }) => (
            <RequirementRow
              key={result.requirement_id}
              tenderId={tenderId}
              requirement={requirement}
              result={result}
              lowQualityPages={lowQualityPages}
              defaultAttester={defaultAttester}
              expanded={expandedIds.has(result.requirement_id)}
              onToggle={() => toggleRow(result.requirement_id)}
              onResolved={onResolved}
            />
          ))}

          {/* Collapsed Rule-checked toggle row */}
          {collapsedRuleCheckedCount > 0 && (
            <div className="border-t border-[#E4E7EC] bg-[#F9FAFB]/60">
              <button
                type="button"
                onClick={() => setShowRuleChecked(true)}
                aria-expanded={false}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-medium text-[#2457D6] hover:bg-[#F2F4F7]/70 transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4 shrink-0" />
                <span>
                  Show {collapsedRuleCheckedCount}{" "}
                  {collapsedRuleCheckedCount === 1
                    ? "rule-checked item"
                    : "rule-checked items"}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Footer Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E7EC] bg-[#F9FAFB] px-4 py-2.5 text-[12.5px] text-[#667085]">
        <span>
          Showing {visibleCount} of {totalInScope} · sorted by severity
        </span>

        {activeTab === "all" &&
          assessment.summary.matched_rule_verified > 0 &&
          (showRuleChecked ? (
            <button
              type="button"
              onClick={() => setShowRuleChecked(false)}
              aria-pressed={true}
              className="inline-flex items-center gap-1 font-medium text-[#2457D6] hover:underline"
            >
              <ChevronDownIcon className="h-3.5 w-3.5" />
              <span>Collapse rule-checked</span>
            </button>
          ) : (
            collapsedRuleCheckedCount > 0 && (
              <button
                type="button"
                onClick={() => setShowRuleChecked(true)}
                aria-pressed={false}
                className="font-medium text-[#2457D6] hover:underline"
              >
                Show all
              </button>
            )
          ))}
      </div>
    </section>
  );
}
