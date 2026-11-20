"use client";

import React, { FormEvent, useRef, useState } from "react";
import { formatFileSize } from "@/lib/types";
import { FilePdfIcon, UploadArrowIcon, XIcon } from "./Icons";

const MAX_BYTES = 25 * 1024 * 1024;

interface UploadZoneProps {
  onUpload: (file: File, title: string) => Promise<boolean>;
  uploading: boolean;
  error: string | null;
  onClearError: () => void;
}

export function UploadZone({
  onUpload,
  uploading,
  error,
  onClearError,
}: UploadZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const resetFileInput = () => {
    setFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const selectFile = (candidate: File | null) => {
    setLocalError(null);
    onClearError();
    if (!candidate) {
      resetFileInput();
      return;
    }
    const isPdf =
      candidate.type === "application/pdf" ||
      candidate.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setLocalError(
        "Only PDF files are supported. Word, Excel, and image files are not accepted."
      );
      resetFileInput();
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setLocalError("File exceeds the 25 MB maximum size limit.");
      resetFileInput();
      return;
    }
    setFile(candidate);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0] || null;
    selectFile(dropped);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!file) {
      setLocalError("Select a PDF tender document to upload.");
      return;
    }
    const ok = await onUpload(file, title.trim());
    if (ok) {
      resetFileInput();
      setTitle("");
    }
  };

  const activeError = localError || error;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-[#101828] leading-tight">
          Check a tender against your company
        </h1>
        <p className="mt-1.5 text-[14px] text-[#667085] leading-relaxed max-w-[640px]">
          Upload the tender PDF. TenderMate lists every requirement with its page,
          checks it against your confirmed profile, and flags what could disqualify
          you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="tm-card p-6 space-y-5">
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
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
          aria-label={file ? undefined : "Upload tender PDF file"}
          className={`rounded-xl border-[1.5px] border-dashed px-6 py-9 text-center transition-colors ${
            isDragging
              ? "border-[#2457D6] bg-[#EFF4FF]"
              : file
                ? "border-[#2457D6]/40 bg-[#F8FAFC]"
                : "border-[#CBD5E1] bg-[#FAFBFC] hover:border-[#94A3B8] cursor-pointer"
          }`}
        >
          <input
            ref={inputRef}
            id="tender-pdf-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => selectFile(e.target.files?.[0] || null)}
            className="sr-only"
          />

          {!file ? (
            <div className="flex flex-col items-center">
              <UploadArrowIcon className="h-6 w-6 text-[#2457D6]" />
              <p className="mt-3 text-[14px] font-semibold text-[#101828]">
                Drag the tender PDF here
              </p>
              <p className="mt-1 text-[13px] text-[#667085]">
                or{" "}
                <span className="font-semibold text-[#2457D6] underline underline-offset-2">
                  browse files
                </span>{" "}
                · PDF only, up to 25 MB
              </p>
              <p className="mt-3 text-[12px] text-[#667085]">
                Scanned pages are read with OCR. Word, Excel and image files are not
                supported.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E4E7EC] bg-white px-4 py-3 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#2457D6]">
                  <FilePdfIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="font-mono text-[13px] font-medium text-[#101828] break-words">
                    {file.name}
                  </div>
                  <div className="text-[12px] text-[#667085]">
                    PDF · {formatFileSize(file.size)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-lg border border-[#E4E7EC] bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-[#344054] hover:bg-[#F9FAFB]"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => resetFileInput()}
                  aria-label="Remove selected PDF file"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E4E7EC] bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-[#912018] hover:bg-[#FEF3F2]"
                >
                  <XIcon className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Optional Tender Name */}
        <div>
          <label
            htmlFor="tender-name-input"
            className="block text-[13px] font-medium text-[#344054]"
          >
            Tender name (optional)
          </label>
          <input
            id="tender-name-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Uses the file name if left empty"
            className="mt-1.5 block w-full rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-[13.5px] text-[#101828] placeholder:text-[#98A2B3] focus:border-[#2457D6]"
          />
        </div>

        {/* Error Alert */}
        {activeError && (
          <div
            role="alert"
            className="rounded-lg border border-[#FDA29B] bg-[#FEF3F2] px-3.5 py-2.5 text-[13px] font-medium text-[#912018]"
          >
            {activeError}
          </div>
        )}

        {/* Submit row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-[12.5px] text-[#667085]">
            Takes about a minute. You can leave this page while it runs.
          </p>
          <button
            type="submit"
            disabled={!file || uploading}
            className="inline-flex items-center justify-center rounded-lg bg-[#2457D6] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#1D46B0] disabled:cursor-not-allowed disabled:bg-[#2457D6]/45"
          >
            {uploading ? "Uploading…" : "Analyse tender"}
          </button>
        </div>
      </form>

      {/* 3-Step Explainers */}
      <section
        aria-label="How TenderMate works"
        className="tm-card p-5 grid grid-cols-1 sm:grid-cols-3 gap-5"
      >
        {[
          {
            step: "1",
            title: "Extract",
            desc: "Every mandatory requirement, quoted exactly with its page.",
          },
          {
            step: "2",
            title: "Check",
            desc: "Rules compare each one to your confirmed company data.",
          },
          {
            step: "3",
            title: "Review",
            desc: "Fix gaps, attach evidence, export a PDF report.",
          },
        ].map((item) => (
          <div key={item.step} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EFF4FF] text-[12px] font-semibold text-[#2457D6]">
              {item.step}
            </span>
            <div>
              <h2 className="text-[13.5px] font-semibold text-[#101828]">
                {item.title}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-[#667085] leading-relaxed">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
