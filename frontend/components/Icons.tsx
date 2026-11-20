import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileCheck2,
  FileText,
  FolderArchive,
  Info,
  Menu,
  Minus,
  Moon,
  Paperclip,
  Plus,
  Sun,
  Upload,
  X,
} from "lucide-react";

interface IconProps {
  className?: string;
}

/**
 * Flat geometric dossier mark in solid primary ink — adapts cleanly to light and dark modes.
 */
export function LogoMark({ className = "h-7 w-7" }: IconProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-btn-primary-bg)] text-[var(--tm-btn-primary-text)] ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 3.5h6.5L15 7v9.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-13Z" />
        <path d="M11.5 3.5V7H15" />
        <path d="M7.5 11.5 9.25 13.25 12.75 9.75" />
      </svg>
    </span>
  );
}

export function TenderNavIcon({ className = "h-4 w-4" }: IconProps) {
  return <FileCheck2 className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function CompanyNavIcon({ className = "h-4 w-4" }: IconProps) {
  return <Building2 className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function LibraryNavIcon({ className = "h-4 w-4" }: IconProps) {
  return <FolderArchive className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function SunIcon({ className = "h-4 w-4" }: IconProps) {
  return <Sun className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function MoonIcon({ className = "h-4 w-4" }: IconProps) {
  return <Moon className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function CheckIcon({ className = "h-4 w-4" }: IconProps) {
  return <Check className={className} strokeWidth={1.75} aria-hidden="true" />;
}

export function XIcon({ className = "h-4 w-4" }: IconProps) {
  return <X className={className} strokeWidth={1.75} aria-hidden="true" />;
}

export function AlertExclamationIcon({ className = "h-4 w-4" }: IconProps) {
  return <AlertCircle className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function WarningIcon({ className = "h-4 w-4" }: IconProps) {
  return <AlertTriangle className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function InfoIcon({ className = "h-4 w-4" }: IconProps) {
  return <Info className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function PaperclipIcon({ className = "h-4 w-4" }: IconProps) {
  return <Paperclip className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function MinusIcon({ className = "h-4 w-4" }: IconProps) {
  return <Minus className={className} strokeWidth={1.75} aria-hidden="true" />;
}

export function ArrowUpRightIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return <ArrowUpRight className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function UploadArrowIcon({ className = "h-5 w-5" }: IconProps) {
  return <Upload className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function DownloadIcon({ className = "h-4 w-4" }: IconProps) {
  return <Download className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function PlusIcon({ className = "h-4 w-4" }: IconProps) {
  return <Plus className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function FilePdfIcon({ className = "h-4 w-4" }: IconProps) {
  return <FileText className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function MenuIcon({ className = "h-5 w-5" }: IconProps) {
  return <Menu className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function ChevronDownIcon({ className = "h-4 w-4" }: IconProps) {
  return <ChevronDown className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function ChevronRightIcon({ className = "h-4 w-4" }: IconProps) {
  return <ChevronRight className={className} strokeWidth={1.5} aria-hidden="true" />;
}
