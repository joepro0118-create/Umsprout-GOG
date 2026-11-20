export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export const DISCLAIMER =
  "Preliminary readiness assessment — verify against the official tender documents.";

export type ComplianceStatus =
  | "matched_rule_verified"
  | "matched_user_evidenced"
  | "gap"
  | "needs_review"
  | "not_applicable";

export const STATUS_LABELS: Record<ComplianceStatus, string> = {
  matched_rule_verified: "Rule-checked",
  matched_user_evidenced: "User-evidenced",
  gap: "Gap",
  needs_review: "Needs review",
  not_applicable: "Not applicable",
};

export interface CompanyDocument {
  id: string;
  document_type: string;
  title: string;
  filename: string;
  storage_path: string;
  valid_from: string | null;
  valid_until: string | null;
  user_confirmed: boolean;
  notes?: string | null;
}

export interface StatusFlagRecord {
  value: boolean | null;
  evidence_document_id: string | null;
  user_confirmed: boolean;
}

export interface CompanyProfile {
  company_id: string;
  name: string;
  registration_number: string;
  confirmed_at: string | null;
  contact: Record<string, string>;
  cidb: {
    active: boolean;
    registration_number: string | null;
    grade: string | null;
    categories: string[];
    valid_from: string | null;
    valid_until: string | null;
    evidence_document_id: string | null;
    user_confirmed: boolean;
  } | null;
  mof: {
    active: boolean;
    registration_number: string | null;
    codes: string[];
    valid_from: string | null;
    valid_until: string | null;
    evidence_document_id: string | null;
    user_confirmed: boolean;
  } | null;
  bumiputera: {
    status: boolean | null;
    valid_from: string | null;
    valid_until: string | null;
    evidence_document_id: string | null;
    user_confirmed: boolean;
  } | null;
  status_flags?: Record<string, StatusFlagRecord>;
  financials: {
    paid_up_capital_rm: number | null;
    net_worth_rm: number | null;
    as_of: string | null;
    evidence_document_id: string | null;
    user_confirmed: boolean;
  } | null;
  documents: CompanyDocument[];
}

export interface TenderMeta {
  id: string;
  title: string;
  filename: string;
  status: "processing" | "completed" | "failed";
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface PageExtractionInfo {
  page_number: number;
  char_count: number;
  image_count: number;
  extraction_method: string;
  low_quality: boolean;
  quality_notes: string | null;
}

export interface ExtractedRequirement {
  id: string;
  original_text: string;
  language: string;
  mandatory_status: string;
  category: string;
  is_disqualifying: boolean;
  explanation: string;
  source_page: number | null;
  source_excerpt: string;
  confidence: string;
  review_required: boolean;
  extraction_pass: string;
  validation_flags: string[];
}

export interface ExtractionOutput {
  tender_file: string;
  extracted_at: string;
  model_used: string;
  page_count: number;
  low_quality_pages: number[];
  pages_info: PageExtractionInfo[];
  requirements: ExtractedRequirement[];
}

export interface UserResolution {
  evidence_document_id: string;
  evidence_filename: string;
  attested_by: string;
  attested_at: string;
  note: string;
}

export interface ComplianceResult {
  requirement_id: string;
  status: ComplianceStatus;
  is_disqualifying: boolean;
  rule_id: string | null;
  inputs: Record<string, unknown>;
  comparison: Record<string, unknown>;
  tender_condition: {
    original_text: string;
    language: string;
    category: string;
    mandatory_status: string;
    source_page: number | null;
    source_excerpt: string;
    structured_condition: Record<string, unknown> | null;
  };
  company_evidence: {
    document_id: string;
    document_type: string;
    title: string;
    filename: string;
    valid_from: string | null;
    valid_until: string | null;
    user_confirmed: boolean;
  } | null;
  missing_evidence_marker: {
    missing: boolean;
    expected_document_type: string;
    reason: string;
  } | null;
  user_resolution: UserResolution | null;
  explanation: string;
}

export interface ComplianceSummary {
  total_requirements: number;
  matched_rule_verified: number;
  matched_user_evidenced: number;
  gap: number;
  needs_review: number;
  not_applicable: number;
  disqualifying_gaps: number;
}

export interface ComplianceAssessment {
  tender_file: string;
  company_id: string;
  company_name: string;
  evaluated_at: string;
  summary: ComplianceSummary;
  results: ComplianceResult[];
}

export interface TenderDetailResponse {
  tender: TenderMeta;
  extraction: ExtractionOutput | null;
  assessment: ComplianceAssessment | null;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatCategory(category: string): string {
  const labels: Record<string, string> = {
    cidb_registration: "CIDB registration",
    mof_registration: "MOF registration",
    bumiputera_status: "Bumiputera status",
    site_briefing: "Site briefing",
    performance_bond: "Performance bond",
    mandatory_documents: "Mandatory documents",
    financial_technical_experience: "Financial",
    submission_instructions: "Submission",
    other: "Other",
  };
  return labels[category] || category.replaceAll("_", " ");
}

export function formatDocumentType(docType: string): string {
  const labels: Record<string, string> = {
    cidb_certificate: "CIDB certificate",
    mof_certificate: "MOF certificate",
    bumiputera_certificate: "Bumiputera",
    ssm_certificate: "SSM",
    ssm_registration: "SSM",
    paid_up_capital: "Paid-up capital",
    financial_statement: "Paid-up capital",
  };
  return labels[docType] || docType.replaceAll("_", " ");
}

export function formatLanguages(requirements: ExtractedRequirement[]): string {
  if (!requirements.length) return "Unknown language";
  const langs = new Set(requirements.map((r) => r.language));
  const hasMs = langs.has("ms") || langs.has("mixed");
  const hasEn = langs.has("en") || langs.has("mixed");
  if (hasMs && hasEn) return "Bahasa Malaysia and English";
  if (hasMs) return "Bahasa Malaysia";
  if (hasEn) return "English";
  return Array.from(langs).join(", ");
}

/**
 * Safely parse an API error response without throwing on plain-text 500s.
 */
export async function extractErrorMessage(
  resp: Response,
  fallback: string
): Promise<string> {
  try {
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = (await resp.json()) as { detail?: unknown };
      if (typeof data?.detail === "string" && data.detail.trim()) {
        return data.detail;
      }
    }
    const text = (await resp.text()).trim();
    if (text) {
      return `Server error (${resp.status}): ${text.slice(0, 240)}`;
    }
  } catch {
    // Ignore secondary parsing error
  }
  return `${fallback} (HTTP ${resp.status})`;
}
