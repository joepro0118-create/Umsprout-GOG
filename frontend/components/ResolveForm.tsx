"use client";

import React, { FormEvent, useRef, useState } from "react";
import {
  API_BASE,
  ComplianceResult,
  extractErrorMessage,
  formatFileSize,
} from "@/lib/types";
import { FilePdfIcon, PaperclipIcon, XIcon } from "./Icons";

const MAX_BYTES = 25 * 1024 * 1024;

interface ResolveFormProps {
  tenderId: string;
  requirementId: string;
  defaultAttester: string;
  onResolved: (updated: ComplianceResult) => void;
}

export function ResolveForm({
  tenderId,
  requirementId,
  defaultAttester,
  onResolved,
}: ResolveFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [attestedBy, setAttestedBy] = useState(defaultAttester);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const fileInputId = `resolve-file-${requirementId}`;
  const attesterInputId = `resolve-attester-${requirementId}`;
  const noteInputId = `resolve-note-${requirementId}`;

  const resetFile = () => {
    setFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const selectFile = (candidate: File | null) => {
    setError(null);
    if (!candidate) {
      resetFile();
      return;
    }
    const isPdf =
      candidate.type === "application/pdf" ||
      candidate.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Evidence must be a PDF file (.pdf)");
      resetFile();
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setError("Evidence file exceeds the 25 MB limit");
      resetFile();
      return;
    }
    setFile(candidate);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    selectFile(e.dataTransfer.files?.[0] || null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError(
        "Attach a PDF evidence file before marking as satisfied. Acknowledging without evidence does not change the status."
      );
      return;
    }
    if (!attestedBy.trim()) {
      setError("Name of the person attesting is required");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("attested_by", attestedBy.trim());
      formData.append("note", note.trim());

      const resp = await fetch(
        `${API_BASE}/api/tenders/${tenderId}/requirements/${requirementId}/resolve`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!resp.ok) {
        const msg = await extractErrorMessage(
          resp,
          "Could not mark requirement as satisfied"
        );
        setError(msg);
        return;
      }

      const data = (await resp.json()) as ComplianceResult;
      resetFile();
      setNote("");
      onResolved(data);
    } catch {
      setError(
        "Network error while uploading evidence. Check that the backend is running."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      {/* Dashed PDF upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isDragging) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onClick={() => {
          if (!file) inputRef.current?.click();
        }}
        role={file ? undefined : "button"}
        tabIndex={file ? undefined : 0}
        onKeyDown={(e) => {
          if (!file && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label={file ? undefined : "Attach supporting PDF evidence"}
        className={`rounded-[10px] border border-dashed px-4 py-3 text-center transition-[color,background-color,border-color] duration-150 ${
          isDragging
            ? "border-[var(--tm-accent)] bg-[var(--tm-accent-soft)]"
            : file
              ? "border-[var(--tm-border-dashed)] bg-[var(--tm-surface)]"
              : "border-[var(--tm-border-dashed)] bg-[var(--tm-surface)] hover:border-[var(--tm-border-dashed-hover)] cursor-pointer"
        }`}
      >
        <input
          ref={inputRef}
          id={fileInputId}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => selectFile(e.target.files?.[0] || null)}
          className="sr-only"
        />

        {!file ? (
          <div className="inline-flex items-center gap-2 text-[13px] text-[var(--tm-text-secondary)]">
            <PaperclipIcon className="h-4 w-4 text-[var(--tm-text-muted)]" />
            <span>
              <span className="font-medium text-[var(--tm-text-primary)]">
                Attach supporting PDF
              </span>{" "}
              · up to 25 MB
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <FilePdfIcon className="h-4 w-4 shrink-0 text-[var(--tm-accent)]" />
              <div className="min-w-0">
                <span className="font-mono text-xs font-medium text-[var(--tm-text-primary)] break-words">
                  {file.name}
                </span>
                <span className="ml-2 font-mono text-xs text-[var(--tm-text-muted)]">
                  {formatFileSize(file.size)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => resetFile()}
              aria-label="Remove attached evidence file"
              className="inline-flex h-7 items-center gap-1 rounded-[6px] border border-[var(--tm-border-strong)] bg-[var(--tm-surface)] px-2 text-xs font-medium text-[var(--tm-gap-text)] transition-colors duration-150 hover:bg-[var(--tm-gap-soft)]"
            >
              <XIcon className="h-3.5 w-3.5" />
              <span>Remove</span>
            </button>
          </div>
        )}
      </div>

      {/* Attested by + Note + Submit button */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label
            htmlFor={attesterInputId}
            className="block text-xs font-medium text-[var(--tm-text-secondary)]"
          >
            Attested by
          </label>
          <input
            id={attesterInputId}
            type="text"
            value={attestedBy}
            onChange={(e) => setAttestedBy(e.target.value)}
            placeholder="Full name"
            required
            className="mt-1.5 block h-9 w-full rounded-[8px] border border-[var(--tm-border-strong)] bg-[var(--tm-surface)] px-3 text-[13px] text-[var(--tm-text-primary)] placeholder:text-[var(--tm-text-muted)] transition-colors duration-150 focus:border-[var(--tm-accent)]"
          />
        </div>

        <div>
          <label
            htmlFor={noteInputId}
            className="block text-xs font-medium text-[var(--tm-text-secondary)]"
          >
            Note (optional)
          </label>
          <input
            id={noteInputId}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Signed JKR attendance slip"
            className="mt-1.5 block h-9 w-full rounded-[8px] border border-[var(--tm-border-strong)] bg-[var(--tm-surface)] px-3 text-[13px] text-[var(--tm-text-primary)] placeholder:text-[var(--tm-text-muted)] transition-colors duration-150 focus:border-[var(--tm-accent)]"
          />
        </div>

        <button
          type="submit"
          disabled={!file || submitting}
          className="inline-flex h-9 items-center justify-center rounded-[8px] bg-[var(--tm-btn-primary-bg)] px-4 text-[13px] font-medium text-[var(--tm-btn-primary-text)] whitespace-nowrap transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--tm-btn-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[var(--tm-btn-primary-disabled)] disabled:active:scale-100"
        >
          {submitting ? "Attaching…" : "Confirm and attach"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-[8px] border border-[var(--tm-gap-border)] bg-[var(--tm-gap-soft)] px-3 py-2 text-xs font-medium text-[var(--tm-gap-text)]"
        >
          {error}
        </div>
      )}

      <p className="text-xs text-[var(--tm-text-muted)]">
        Saved as a user attestation with your name, time and file · not rule-verified
      </p>
    </form>
  );
}
