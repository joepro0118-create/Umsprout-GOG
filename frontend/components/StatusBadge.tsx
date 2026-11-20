import { ComplianceStatus, STATUS_LABELS } from "@/lib/types";
import { CheckIcon, MinusIcon, PaperclipIcon, XIcon } from "./Icons";

interface StatusBadgeProps {
  status: ComplianceStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = STATUS_LABELS[status];

  if (status === "gap") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[6px] bg-[var(--tm-gap)] px-2 py-0.5 text-xs font-medium leading-5 text-white whitespace-nowrap">
        <XIcon className="h-3 w-3 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  if (status === "needs_review") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--tm-review-border)] bg-[var(--tm-review-soft)] px-2 py-0.5 text-xs font-medium leading-5 text-[var(--tm-review-text)] whitespace-nowrap">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--tm-review)]"
          aria-hidden="true"
        />
        <span>{label}</span>
      </span>
    );
  }

  if (status === "matched_rule_verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--tm-rule-border)] bg-[var(--tm-rule-soft)] px-2 py-0.5 text-xs font-medium leading-5 text-[var(--tm-rule-text)] whitespace-nowrap">
        <CheckIcon className="h-3 w-3 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  if (status === "matched_user_evidenced") {
    return (
      <span
        title="User attestation with attached evidence (not rule-verified)"
        className="inline-flex items-center gap-1 rounded-[6px] border border-dashed border-[var(--tm-accent-border)] bg-[var(--tm-accent-soft)] px-2 py-0.5 text-xs font-medium leading-5 text-[var(--tm-accent)] whitespace-nowrap"
      >
        <PaperclipIcon className="h-3 w-3 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--tm-border)] bg-[var(--tm-raised)] px-2 py-0.5 text-xs font-medium leading-5 text-[var(--tm-text-secondary)] whitespace-nowrap">
      <MinusIcon className="h-3 w-3 shrink-0" />
      <span>{label}</span>
    </span>
  );
}
