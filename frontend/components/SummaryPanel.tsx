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
      className: "bg-[var(--tm-gap)]",
      label: `${summary.gap} Gap`,
    },
    {
      key: "needs_review",
      count: summary.needs_review,
      pct: (summary.needs_review / total) * 100,
      className: "bg-[var(--tm-review)]",
      label: `${summary.needs_review} Needs review`,
    },
    {
      key: "matched_user_evidenced",
      count: summary.matched_user_evidenced,
      pct: (summary.matched_user_evidenced / total) * 100,
      className: "tm-evidenced-hatch border border-dashed border-[var(--tm-accent-border)]",
      label: `${summary.matched_user_evidenced} User-evidenced`,
    },
    {
      key: "matched_rule_verified",
      count: summary.matched_rule_verified,
      pct: (summary.matched_rule_verified / total) * 100,
      className: "bg-[var(--tm-rule)]",
      label: `${summary.matched_rule_verified} Rule-checked`,
    },
    {
      key: "not_applicable",
      count: summary.not_applicable,
      pct: (summary.not_applicable / total) * 100,
      className: "bg-[var(--tm-text-faint)]",
      label: `${summary.not_applicable} Not applicable`,
    },
  ].filter((s) => s.count > 0);

  return (
    <section aria-label="Assessment summary" className="tm-card p-6 space-y-5">
      {/* Stat figures row — numbers only, crisp tabular alignment */}
      <div
        className={`grid grid-cols-2 gap-y-4 ${
          summary.not_applicable > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"
        } sm:divide-x sm:divide-[var(--tm-border)]`}
      >
        <div className="sm:pr-6">
          <div className="flex items-center gap-2 text-xs text-[var(--tm-text-secondary)]">
            <span
              className="h-2 w-2 rounded-full bg-[var(--tm-gap)]"
              aria-hidden="true"
            />
            <span>Gaps</span>
          </div>
          <div
            className={`mt-2 text-[28px] font-medium leading-none tabular-nums ${
              summary.gap > 0
                ? "text-[var(--tm-gap)]"
                : "text-[var(--tm-text-primary)]"
            }`}
          >
            {summary.gap}
          </div>
          <div className="mt-2 text-xs text-[var(--tm-text-muted)]">
            {summary.disqualifying_gaps > 0
              ? `${summary.disqualifying_gaps} Tier B disqualifying`
              : "No disqualifying gaps"}
          </div>
        </div>

        <div className="sm:px-6">
          <div className="flex items-center gap-2 text-xs text-[var(--tm-text-secondary)]">
            <span
              className="h-2 w-2 rounded-full bg-[var(--tm-review)]"
              aria-hidden="true"
            />
            <span>Needs review</span>
          </div>
          <div className="mt-2 text-[28px] font-medium leading-none tabular-nums text-[var(--tm-text-primary)]">
            {summary.needs_review}
          </div>
          <div className="mt-2 text-xs text-[var(--tm-text-muted)]">
            {needsReviewTierB > 0
              ? `${needsReviewTierB} Tier B mandatory`
              : "Awaiting human check"}
          </div>
        </div>

        <div className="sm:px-6">
          <div className="flex items-center gap-2 text-xs text-[var(--tm-text-secondary)]">
            <span
              className="h-2 w-2 rounded-full bg-[var(--tm-rule)]"
              aria-hidden="true"
            />
            <span>Rule-checked</span>
          </div>
          <div className="mt-2 text-[28px] font-medium leading-none tabular-nums text-[var(--tm-text-primary)]">
            {summary.matched_rule_verified}
          </div>
          <div className="mt-2 text-xs text-[var(--tm-text-muted)]">
            Verified by rules
          </div>
        </div>

        <div className={summary.not_applicable > 0 ? "sm:px-6" : "sm:pl-6"}>
          <div className="flex items-center gap-2 text-xs text-[var(--tm-text-secondary)]">
            <span
              className="h-2 w-2 rounded-full border-[1.5px] border-[var(--tm-accent)] bg-[var(--tm-accent-soft)]"
              aria-hidden="true"
            />
            <span>User-evidenced</span>
          </div>
          <div className="mt-2 text-[28px] font-medium leading-none tabular-nums text-[var(--tm-text-primary)]">
            {summary.matched_user_evidenced}
          </div>
          <div className="mt-2 text-xs text-[var(--tm-text-muted)]">
            Attested with PDF
          </div>
        </div>

        {summary.not_applicable > 0 && (
          <div className="sm:pl-6">
            <div className="flex items-center gap-2 text-xs text-[var(--tm-text-secondary)]">
              <span
                className="h-2 w-2 rounded-full bg-[var(--tm-text-faint)]"
                aria-hidden="true"
              />
              <span>Not applicable</span>
            </div>
            <div className="mt-2 text-[28px] font-medium leading-none tabular-nums text-[var(--tm-text-primary)]">
              {summary.not_applicable}
            </div>
            <div className="mt-2 text-xs text-[var(--tm-text-muted)]">
              Out of scope
            </div>
          </div>
        )}
      </div>

      {/* Proportional distribution bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--tm-text-muted)]">
          <span>Requirement distribution</span>
          <span className="font-mono">
            {summary.total_requirements}{" "}
            {summary.total_requirements === 1 ? "requirement" : "requirements"}
          </span>
        </div>
        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--tm-raised)] gap-[2px]"
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
      </div>

      {/* Verdict callout with signature left dossier rule */}
      {summary.disqualifying_gaps > 0 ? (
        <div className="rounded-r-[8px] border border-[var(--tm-gap-border)] border-l-2 border-l-[var(--tm-gap)] bg-[var(--tm-gap-soft)] px-4 py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-xs font-medium text-[var(--tm-gap-text)] shrink-0">
            {summary.disqualifying_gaps}{" "}
            {summary.disqualifying_gaps === 1
              ? "disqualifying gap"
              : "disqualifying gaps"}
          </span>
          <p className="text-[13px] font-medium text-[var(--tm-text-primary)]">
            {firstDisqualifyingGap?.explanation ||
              "One or more Tier B mandatory requirements did not match the confirmed company profile"}
          </p>
        </div>
      ) : (
        <div className="rounded-r-[8px] border border-[var(--tm-rule-border)] border-l-2 border-l-[var(--tm-rule)] bg-[var(--tm-rule-soft)] px-4 py-3 text-[13px] text-[var(--tm-text-primary)]">
          {summary.needs_review > 0
            ? `No disqualifying gaps in rule-checked items · ${summary.needs_review} ${
                summary.needs_review === 1 ? "item still needs" : "items still need"
              } review`
            : "No disqualifying gaps in rule-checked items · all items reviewed"}
        </div>
      )}
    </section>
  );
}
