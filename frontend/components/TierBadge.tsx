interface TierBadgeProps {
  isDisqualifying: boolean;
}

export function TierBadge({ isDisqualifying }: TierBadgeProps) {
  if (!isDisqualifying) {
    return (
      <span
        className="text-xs text-[var(--tm-text-faint)]"
        aria-label="Not Tier B"
      >
        —
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-[6px] border border-[var(--tm-gap-border)] bg-[var(--tm-gap-soft)] px-2 py-0.5 font-mono text-xs font-medium leading-5 text-[var(--tm-gap-text)] whitespace-nowrap">
      Tier B
    </span>
  );
}
