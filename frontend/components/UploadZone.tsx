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
      setLocalError("File exceeds the 25 MB maximum size limit");
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
      setLocalError("Select a PDF tender document to upload");
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
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="tm-card p-6 space-y-6">
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
          className={`rounded-[10px] border border-dashed px-6 py-10 text-center transition-[color,background-color,border-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isDragging
              ? "border-[var(--tm-accent)] bg-[var(--tm-accent-soft)]"
              : file
                ? "border-[var(--tm-border-dashed)] bg-[var(--tm-surface-subtle)]"
                : "border-[var(--tm-border-dashed)] bg-[var(--tm-surface-subtle)] hover:border-[var(--tm-border-dashed-hover)] hover:bg-[var(--tm-raised)] cursor-pointer"
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
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--tm-border)] bg-[var(--tm-surface)] text-[var(--tm-text-secondary)] shadow-[var(--tm-card-shadow)]">
                <UploadArrowIcon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-medium text-[var(--tm-text-primary)]">
                Drop tender PDF here
              </p>
              <p className="mt-1 text-[13px] text-[var(--tm-text-secondary)]">
                or{" "}
                <span className="font-medium text-[var(--tm-accent)] underline underline-offset-2">
                  browse files
                </span>{" "}
                · PDF only, up to 25 MB
              </p>
              <p className="mt-3 text-xs text-[var(--tm-text-muted)]">
                Scanned pages are read with OCR · Word, Excel and image files
                are not supported
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)] px-4 py-3 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-accent-soft)] text-[var(--tm-accent)]">
                  <FilePdfIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="font-mono text-[13px] font-medium text-[var(--tm-text-primary)] break-words">
                    {file.name}
                  </div>
                  <div className="font-mono text-xs text-[var(--tm-text-muted)]">
                    PDF · {formatFileSize(file.size)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex h-8 items-center rounded-[8px] border border-[var(--tm-border-strong)] bg-[var(--tm-surface)] px-3 text-xs font-medium text-[var(--tm-text-primary)] transition-colors duration-150 hover:bg-[var(--tm-raised)]"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => resetFileInput()}
                  aria-label="Remove selected PDF file"
                  className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-[var(--tm-border-strong)] bg-[var(--tm-surface)] px-3 text-xs font-medium text-[var(--tm-gap-text)] transition-colors duration-150 hover:bg-[var(--tm-gap-soft)]"
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
            className="block text-[13px] font-medium text-[var(--tm-text-primary)]"
          >
            Tender name{" "}
            <span className="font-normal text-[var(--tm-text-muted)]">
              (optional)
            </span>
          </label>
          <input
            id="tender-name-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Uses the file name if left blank"
            className="mt-2 block h-10 w-full rounded-[8px] border border-[var(--tm-border-strong)] bg-[var(--tm-surface)] px-3 text-sm text-[var(--tm-text-primary)] placeholder:text-[var(--tm-text-muted)] transition-colors duration-150 focus:border-[var(--tm-accent)]"
          />
        </div>

        {/* Error Alert */}
        {activeError && (
          <div
            role="alert"
            className="rounded-r-[8px] border border-[var(--tm-gap-border)] border-l-2 border-l-[var(--tm-gap)] bg-[var(--tm-gap-soft)] px-4 py-3 text-[13px] text-[var(--tm-gap-text)]"
          >
            {activeError}
          </div>
        )}

        {/* Submit row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <p className="text-xs text-[var(--tm-text-muted)]">
            Takes about a minute · you can leave this page while it runs
          </p>
          <button
            type="submit"
            disabled={!file || uploading}
            className="inline-flex h-10 items-center justify-center rounded-[8px] bg-[var(--tm-btn-primary-bg)] px-5 text-sm font-medium text-[var(--tm-btn-primary-text)] transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--tm-btn-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[var(--tm-btn-primary-disabled)] disabled:active:scale-100"
          >
            {uploading ? "Uploading…" : "Analyse tender"}
          </button>
        </div>
      </form>

      {/* Quiet single-line workflow note */}
      <p className="px-1 text-xs text-[var(--tm-text-muted)]">
        <span className="font-mono text-[var(--tm-text-secondary)]">1</span>{" "}
        Extract clauses with page citations{" "}
        <span className="mx-1.5 text-[var(--tm-text-faint)]">·</span>{" "}
        <span className="font-mono text-[var(--tm-text-secondary)]">2</span>{" "}
        Check against confirmed company rules{" "}
        <span className="mx-1.5 text-[var(--tm-text-faint)]">·</span>{" "}
        <span className="font-mono text-[var(--tm-text-secondary)]">3</span>{" "}
        Attach evidence and export PDF report
      </p>
    </div>
  );
}
