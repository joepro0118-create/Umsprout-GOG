interface TierBadgeProps {
  isDisqualifying: boolean;
}

export function TierBadge({ isDisqualifying }: TierBadgeProps) {
  if (!isDisqualifying) {
    return <span className="text-[#667085]" aria-label="Not Tier B">—</span>;
  }

  return (
    <span className="inline-flex items-center rounded-md bg-[#FEE4E2] px-2 py-0.5 text-[12px] font-semibold leading-5 text-[#912018] whitespace-nowrap">
      Tier B
    </span>
  );
}
