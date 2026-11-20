import React from "react";

interface IconProps {
  className?: string;
}

export function LogoMark({ className = "h-7 w-7" }: IconProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-[#2457D6] text-white ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5.5 10.5l3 3 6-6.5" />
      </svg>
    </span>
  );
}

export function CheckIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function XIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
    </svg>
  );
}

export function AlertExclamationIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3.5v5.5" />
      <circle cx="8" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PaperclipIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.5 7.5l-5.3 5.3a3 3 0 01-4.24-4.24l6-6a2 2 0 012.83 2.83l-5.65 5.65a1 1 0 01-1.42-1.41l5-5" />
    </svg>
  );
}

export function MinusIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 8h8" />
    </svg>
  );
}

export function ArrowUpRightIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 11L11 5M6 5h5v5" />
    </svg>
  );
}

export function UploadArrowIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 16V4M12 4l-4.5 4.5M12 4l4.5 4.5" />
      <path d="M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" />
    </svg>
  );
}

export function FilePdfIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 2.5h6.5L15.5 6.5V17a1 1 0 01-1 1h-9.5a1 1 0 01-1-1V3.5a1 1 0 011-1z" />
      <path d="M11.5 2.5V6.5h4" />
    </svg>
  );
}

export function MenuIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}
