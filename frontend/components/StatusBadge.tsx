import { ComplianceStatus, STATUS_LABELS } from "@/lib/types";
import {
  AlertExclamationIcon,
  CheckIcon,
  MinusIcon,
  PaperclipIcon,
  XIcon,
} from "./Icons";

interface StatusBadgeProps {
  status: ComplianceStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = STATUS_LABELS[status];

  if (status === "gap") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#C0261A] px-2 py-0.5 text-[12px] font-semibold leading-5 text-white whitespace-nowrap">
        <XIcon className="h-3 w-3 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  if (status === "needs_review") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#FEF0C7] px-2 py-0.5 text-[12px] font-semibold leading-5 text-[#7A2E0E] whitespace-nowrap">
        <AlertExclamationIcon className="h-3 w-3 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  if (status === "matched_rule_verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#E7F6EC] px-2 py-0.5 text-[12px] font-semibold leading-5 text-[#05603A] whitespace-nowrap">
        <CheckIcon className="h-3 w-3 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  if (status === "matched_user_evidenced") {
    return (
      <span
        title="User attestation with attached evidence (not rule-verified)"
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#1D4ED8] bg-[#EFF4FF] px-2 py-0.5 text-[12px] font-semibold leading-5 text-[#1D4ED8] whitespace-nowrap"
      >
        <PaperclipIcon className="h-3 w-3 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[#F2F4F7] px-2 py-0.5 text-[12px] font-semibold leading-5 text-[#475467] whitespace-nowrap">
      <MinusIcon className="h-3 w-3 shrink-0" />
      <span>{label}</span>
    </span>
  );
}
