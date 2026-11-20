"use client";

import React, { FormEvent, useRef, useState } from "react";
import {
  API_BASE,
  ComplianceResult,
  extractErrorMessage,
  formatFileSize,
} from "@/lib/types";
import { FilePdfIcon, XIcon } from "./Icons";

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
      setError("Evidence must be a PDF file (.pdf).");
      resetFile();
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setError("Evidence file exceeds the 25 MB limit.");
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
      setError("Name of the person attesting is required.");
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
          "Could not mark requirement as satisfied."
        );
        setError(msg);
        return;
      }

      const data = (await resp.json()) as ComplianceResult;
      resetFile();
      setNote("");
      onResolved(data);
    } catch {
      setError("Network error while uploading evidence. Check that the backend is running.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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
        className={`rounded-lg border-[1.5px] border-dashed px-4 py-3.5 text-center transition-colors ${
          isDragging
            ? "border-[#2457D6] bg-[#EFF4FF]"
            : file
              ? "border-[#2457D6]/40 bg-[#F8FAFC]"
              : "border-[#CBD5E1] bg-white hover:border-[#94A3B8] cursor-pointer"
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
          <p className="text-[13px] text-[#667085]">
            <strong className="font-semibold text-[#101828]">
              Attach evidence
            </strong>{" "}
            · PDF only, up to 25 MB
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <FilePdfIcon className="h-4 w-4 shrink-0 text-[#2457D6]" />
              <div className="min-w-0">
                <span className="font-mono text-[12.5px] font-medium text-[#101828] break-words">
                  {file.name}
                </span>
                <span className="ml-2 text-[12px] text-[#667085]">
                  ({formatFileSize(file.size)})
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => resetFile()}
              aria-label="Remove attached evidence file"
              className="inline-flex items-center gap-1 rounded-md border border-[#E4E7EC] bg-white px-2 py-1 text-[12px] font-medium text-[#912018] hover:bg-[#FEF3F2]"
            >
              <XIcon className="h-3 w-3" />
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
            className="block text-[12px] font-medium text-[#344054]"
          >
            Attested by
          </label>
          <input
            id={attesterInputId}
            type="text"
            value={attestedBy}
            onChange={(e) => setAttestedBy(e.target.value)}
            placeholder="Your full name"
            required
            className="mt-1 block w-full rounded-lg border border-[#D0D5DD] bg-white px-3 py-1.5 text-[13px] text-[#101828] placeholder:text-[#98A2B3] focus:border-[#2457D6]"
          />
        </div>

        <div>
          <label
            htmlFor={noteInputId}
            className="block text-[12px] font-medium text-[#344054]"
          >
            Note (optional)
          </label>
          <input
            id={noteInputId}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Signed JKR attendance slip"
            className="mt-1 block w-full rounded-lg border border-[#D0D5DD] bg-white px-3 py-1.5 text-[13px] text-[#101828] placeholder:text-[#98A2B3] focus:border-[#2457D6]"
          />
        </div>

        <button
          type="submit"
          disabled={!file || submitting}
          className="inline-flex items-center justify-center rounded-lg bg-[#2457D6] px-4 py-1.5 h-[34px] text-[13px] font-semibold text-white whitespace-nowrap transition-colors hover:bg-[#1D46B0] disabled:cursor-not-allowed disabled:bg-[#2457D6]/45"
        >
          {submitting ? "Attaching…" : "Confirm and attach"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-[#FDA29B] bg-[#FEF3F2] px-3 py-2 text-[12.5px] font-medium text-[#912018]"
        >
          {error}
        </div>
      )}

      <p className="text-[12px] text-[#667085]">
        Saved as a user attestation with your name, time and file. Not rule-verified.
      </p>
    </form>
  );
}
