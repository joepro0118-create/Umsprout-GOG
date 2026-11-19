"use client";

import { FormEvent, useState } from "react";
import {
  API_BASE,
  ComplianceResult,
  ComplianceStatus,
  ExtractedRequirement,
  STATUS_LABELS,
  formatDateTime,
} from "@/lib/types";

interface Props {
  tenderId: string;
  requirement: ExtractedRequirement;
  result: ComplianceResult;
  defaultAttester: string;
  onResolved: (updated: ComplianceResult) => void;
}

function StatusBadge({ status }: { status: ComplianceStatus }) {
  const label = STATUS_LABELS[status];
  if (status === "matched_rule_verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
        <span aria-hidden="true">✓</span> {label}
      </span>
    );
  }
  if (status === "matched_user_evidenced") {
    return (
      <span
        title="User attestation with attached evidence (not rule-verified)"
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-blue-600 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800"
      >
        <span aria-hidden="true">📎</span> {label}
      </span>
    );
  }
  if (status === "gap") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
        <span aria-hidden="true">✕</span> {label}
      </span>
    );
  }
  if (status === "needs_review") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-300">
        <span aria-hidden="true">!</span> {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {label}
    </span>
  );
}

export function RequirementCard({
  tenderId,
  requirement,
  result,
  defaultAttester,
  onResolved,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [attestedBy, setAttestedBy] = useState(defaultAttester);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const page = requirement.source_page;
  const pageUrl = page ? `${API_BASE}/api/tenders/${tenderId}/pdf#page=${page}` : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError(
        "Attach a PDF evidence file before marking as satisfied. Acknowledging without evidence does not change the status."
      );
      return;
    }
    if (!attestedBy.trim()) {
      setError("Enter the name of the person attesting.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("attested_by", attestedBy.trim());
      formData.append("note", note.trim());

      const resp = await fetch(
        `${API_BASE}/api/tenders/${tenderId}/requirements/${requirement.id}/resolve`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.detail || "Could not mark as satisfied.");
        return;
      }
      onResolved(data as ComplianceResult);
      setShowForm(false);
      setFile(null);
      setNote("");
    } catch {
      setError("Network error while uploading evidence.");
    } finally {
      setSubmitting(false);
    }
  }

  const borderAccent =
    result.status === "gap"
      ? "border-l-4 border-l-red-500"
      : result.status === "matched_rule_verified"
        ? "border-l-4 border-l-emerald-500"
        : result.status === "matched_user_evidenced"
          ? "border-l-4 border-l-blue-500"
          : "border-l-4 border-l-amber-400";

  return (
    <article
      className={`rounded-lg border border-slate-200 bg-white p-4 shadow-xs ${borderAccent}`}
    >
      {/* Top row: ID, Page link, Category, Tier B badge, Status badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-700">{requirement.id}</span>
          {pageUrl ? (
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-blue-700 underline decoration-blue-300 hover:bg-blue-50"
            >
              Page {page} ↗
            </a>
          ) : (
            <span className="rounded bg-red-50 px-2 py-0.5 font-mono text-xs text-red-700">
              Uncited
            </span>
          )}
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {requirement.category.replaceAll("_", " ")}
          </span>
          {requirement.is_disqualifying && (
            <span className="inline-flex items-center rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-300">
              Tier B · Disqualifying
            </span>
          )}
        </div>
        <StatusBadge status={result.status} />
      </div>

      {/* Original tender wording (preserved verbatim) */}
      <div className="mt-3">
        <p className="text-sm font-medium text-slate-900">“{requirement.original_text}”</p>
        <p className="mt-1 text-xs text-slate-600">{requirement.explanation}</p>
        {requirement.validation_flags.length > 0 && (
          <p className="mt-1.5 text-xs font-medium text-amber-800">
            Extraction flags: {requirement.validation_flags.join(", ")}
          </p>
        )}
      </div>

      {/* Rule / Evidence Audit Trail */}
      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
        {(result.status === "matched_rule_verified" || result.status === "gap") && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                <strong className="text-slate-700">Rule:</strong>{" "}
                <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-slate-900">
                  {result.rule_id || "—"}
                </code>
              </span>
              {Boolean(result.comparison?.expression || result.comparison?.reason) && (
                <span>
                  <strong className="text-slate-700">Comparison:</strong>{" "}
                  <code className="font-mono text-slate-800">
                    {String(result.comparison.expression || result.comparison.reason)}
                  </code>
                </span>
              )}
            </div>
            <div>
              <strong className="text-slate-700">Company evidence:</strong>{" "}
              {result.company_evidence ? (
                <span className="text-slate-800">
                  {result.company_evidence.title} (
                  <code className="font-mono">{result.company_evidence.document_id}</code> ·{" "}
                  <code className="font-mono">{result.company_evidence.filename}</code>)
                </span>
              ) : result.missing_evidence_marker ? (
                <span className="font-semibold text-red-700">
                  MISSING EVIDENCE — {result.missing_evidence_marker.reason}
                </span>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </div>
            <div className="text-slate-600">{result.explanation}</div>
          </div>
        )}

        {result.status === "matched_user_evidenced" && result.user_resolution && (
          <div className="space-y-1">
            <div className="font-semibold text-blue-800">
              User attestation with attached evidence (not rule-verified)
            </div>
            <div>
              <strong className="text-slate-700">Evidence reference:</strong>{" "}
              <a
                href={`${API_BASE}/api/tenders/${tenderId}/evidence/${result.user_resolution.evidence_document_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-blue-700 underline hover:text-blue-900"
              >
                {result.user_resolution.evidence_document_id} —{" "}
                {result.user_resolution.evidence_filename} ↗
              </a>
            </div>
            <div>
              <strong className="text-slate-700">Attested by:</strong>{" "}
              {result.user_resolution.attested_by} ·{" "}
              <strong className="text-slate-700">When:</strong>{" "}
              {formatDateTime(result.user_resolution.attested_at)}
            </div>
            {result.user_resolution.note && (
              <div>
                <strong className="text-slate-700">Note:</strong> {result.user_resolution.note}
              </div>
            )}
          </div>
        )}

        {result.status === "needs_review" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-700">{result.explanation}</span>
              <button
                type="button"
                onClick={() => {
                  setShowForm((v) => !v);
                  setError(null);
                }}
                className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
              >
                {showForm ? "Cancel" : "Mark as satisfied"}
              </button>
            </div>

            {showForm && (
              <form
                onSubmit={handleSubmit}
                className="mt-2 space-y-2.5 rounded border border-slate-300 bg-white p-3"
              >
                <p className="text-xs text-slate-600">
                  Upload supporting PDF evidence to record this item as{" "}
                  <strong>User-evidenced</strong>. Without an uploaded PDF, status stays{" "}
                  <strong>Needs Review</strong>.
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">
                      Evidence PDF (required)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-xs text-slate-700 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-800 hover:file:bg-slate-200"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">
                      Attested by (required)
                    </span>
                    <input
                      type="text"
                      value={attestedBy}
                      onChange={(e) => setAttestedBy(e.target.value)}
                      placeholder="Your name"
                      className="mt-1 block w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-slate-700">Note (optional)</span>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g., Signed JKR attendance slip attached"
                    className="mt-1 block w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </label>

                {error && (
                  <p className="rounded bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
                    {error}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {submitting ? "Uploading..." : "Confirm & Attach Evidence"}
                  </button>
                  <span className="text-[11px] text-slate-500">
                    Records who, timestamp, and file reference.
                  </span>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
