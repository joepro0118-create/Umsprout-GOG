import { ComplianceAssessment } from "@/lib/types";

interface SummaryPanelProps {
  assessment: ComplianceAssessment;
}

export function SummaryPanel({ assessment }: SummaryPanelProps) {
  const { summary, results } = assessment;
  const total = Math.max(summary.total_requirements, 1);

  const firstDisqualifyingGap = results.find(
    (r) => r.status === "gap" && r.is_disqualifying
  );
  const needsReviewTierB = results.filter(
    (r) => r.status === "needs_review" && r.is_disqualifying
  ).length;

  const segments = [
    {
      key: "gap",
      count: summary.gap,
      pct: (summary.gap / total) * 100,
      className: "bg-[#C0261A]",
      label: `${summary.gap} Gap`,
    },
    {
      key: "needs_review",
      count: summary.needs_review,
      pct: (summary.needs_review / total) * 100,
      className: "bg-[#EAB308]",
      label: `${summary.needs_review} Needs review`,
    },
    {
      key: "matched_user_evidenced",
      count: summary.matched_user_evidenced,
      pct: (summary.matched_user_evidenced / total) * 100,
      className: "bg-[#EFF4FF] border border-dashed border-[#2457D6]",
      label: `${summary.matched_user_evidenced} User-evidenced`,
    },
    {
      key: "matched_rule_verified",
      count: summary.matched_rule_verified,
      pct: (summary.matched_rule_verified / total) * 100,
      className: "bg-[#15803D]",
      label: `${summary.matched_rule_verified} Rule-checked`,
    },
    {
      key: "not_applicable",
      count: summary.not_applicable,
      pct: (summary.not_applicable / total) * 100,
      className: "bg-[#98A2B3]",
      label: `${summary.not_applicable} Not applicable`,
    },
  ].filter((s) => s.count > 0);

  return (
    <section aria-label="Assessment summary" className="tm-card p-5 space-y-3.5">
      {/* Headline */}
      <div className="flex flex-wrap items-center gap-2.5">
        {summary.disqualifying_gaps > 0 ? (
          <>
            <span className="inline-flex items-center rounded-md bg-[#C0261A] px-2.5 py-0.5 text-[12px] font-semibold text-white whitespace-nowrap">
              {summary.disqualifying_gaps}{" "}
              {summary.disqualifying_gaps === 1
                ? "disqualifying gap"
                : "disqualifying gaps"}
            </span>
            <p className="text-[13.5px] font-semibold text-[#912018]">
              {firstDisqualifyingGap?.explanation ||
                "One or more Tier B mandatory requirements did not match the confirmed company profile."}
            </p>
          </>
        ) : (
          <p className="text-[13.5px] font-medium text-[#101828]">
            {summary.needs_review > 0
              ? `No disqualifying gaps in rule-checked items. ${summary.needs_review} ${
                  summary.needs_review === 1 ? "item still needs" : "items still need"
                } review.`
              : "No disqualifying gaps in rule-checked items. All items reviewed."}
          </p>
        )}
      </div>

      {/* Segmented progress bar */}
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#F2F4F7] gap-[2px]"
        role="img"
        aria-label={`Summary breakdown: ${segments.map((s) => s.label).join(", ")}`}
      >
        {segments.map((seg) => (
          <div
            key={seg.key}
            style={{ width: `${seg.pct}%` }}
            title={seg.label}
            className={`h-full first:rounded-l-full last:rounded-r-full ${seg.className}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[12.5px]">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`font-semibold ${
                summary.gap > 0 ? "text-[#C0261A]" : "text-[#101828]"
              }`}
            >
              {summary.gap}
            </span>
            <span className="text-[#667085]">Gap</span>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-[#101828]">
              {summary.needs_review}
            </span>
            <span className="text-[#667085]">
              Needs review
              {needsReviewTierB > 0 ? ` · ${needsReviewTierB} Tier B` : ""}
            </span>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-[#101828]">
              {summary.matched_rule_verified}
            </span>
            <span className="text-[#667085]">Rule-checked</span>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-[#101828]">
              {summary.matched_user_evidenced}
            </span>
            <span className="text-[#667085]">User-evidenced</span>
          </span>

          {summary.not_applicable > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="font-semibold text-[#101828]">
                {summary.not_applicable}
              </span>
              <span className="text-[#667085]">Not applicable</span>
            </span>
          )}
        </div>

        <span className="text-[#667085]">
          {summary.total_requirements}{" "}
          {summary.total_requirements === 1 ? "requirement" : "requirements"}
        </span>
      </div>
    </section>
  );
}
