"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell, NavSection } from "@/components/AppShell";
import { CompanyView } from "@/components/CompanyView";
import {
  ArrowUpRightIcon,
  DownloadIcon,
  PlusIcon,
  WarningIcon,
} from "@/components/Icons";
import { RequirementTable } from "@/components/RequirementTable";
import { SummaryPanel } from "@/components/SummaryPanel";
import { TenderList } from "@/components/TenderList";
import { UploadZone } from "@/components/UploadZone";
import {
  API_BASE,
  CompanyProfile,
  ComplianceResult,
  ComplianceSummary,
  TenderDetailResponse,
  TenderMeta,
  extractErrorMessage,
  formatDateShort,
  formatLanguages,
} from "@/lib/types";

type ActiveView = "upload" | "review" | "company";

export default function HomePage() {
  const [view, setView] = useState<ActiveView>("upload");
  const [activeNav, setActiveNav] = useState<NavSection>("tender");

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [tenders, setTenders] = useState<TenderMeta[]>([]);
  const [summaries, setSummaries] = useState<Record<string, ComplianceSummary>>(
    {}
  );
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TenderDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadTenders = useCallback(async (selectLatest = false) => {
    const resp = await fetch(`${API_BASE}/api/tenders`);
    if (!resp.ok) {
      throw new Error(await extractErrorMessage(resp, "Failed to load tenders"));
    }
    const list = (await resp.json()) as TenderMeta[];
    setTenders(list);
    if (selectLatest && list.length > 0) {
      setSelectedId((prev) => prev || list[0].id);
      setView("review");
    }
    return list;
  }, []);

  const loadTenderDetail = useCallback(async (id: string) => {
    const resp = await fetch(`${API_BASE}/api/tenders/${id}`);
    if (!resp.ok) {
      throw new Error(
        await extractErrorMessage(resp, "Failed to load tender detail")
      );
    }
    const data = (await resp.json()) as TenderDetailResponse;
    setDetail(data);
    if (data.assessment?.summary) {
      setSummaries((prev) => ({
        ...prev,
        [id]: data.assessment!.summary,
      }));
    }
    return data;
  }, []);

  // Initial load: company profile + tender list
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [compResp] = await Promise.all([
          fetch(`${API_BASE}/api/company`),
          loadTenders(true),
        ]);
        if (!compResp.ok) {
          throw new Error(
            await extractErrorMessage(
              compResp,
              "Failed to load company profile"
            )
          );
        }
        const comp = (await compResp.json()) as CompanyProfile;
        if (active) {
          setProfile(comp);
          setApiError(null);
        }
      } catch {
        if (active) {
          setApiError(
            `Cannot reach FastAPI backend at ${API_BASE}. Start it with: py -m uvicorn api:app --reload --port 8000`
          );
        }
      } finally {
        if (active) {
          setInitialLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [loadTenders]);

  // Fetch & poll selected tender while processing (every 2s)
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setLoadingDetail(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    setLoadingDetail(true);

    async function fetchAndMaybePoll(id: string) {
      try {
        const data = await loadTenderDetail(id);
        if (!cancelled) {
          setLoadingDetail(false);
          setApiError(null);
        }
        if (!cancelled && data.tender.status === "processing") {
          timer = setTimeout(() => fetchAndMaybePoll(id), 2000);
        } else if (!cancelled) {
          loadTenders(false).catch(() => {});
        }
      } catch (err) {
        if (!cancelled) {
          setLoadingDetail(false);
          setApiError(
            err instanceof Error
              ? err.message
              : "Failed to fetch tender status"
          );
        }
      }
    }

    fetchAndMaybePoll(selectedId);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [selectedId, loadTenderDetail, loadTenders]);

  // Poll tender list while on upload view if any tender is processing
  useEffect(() => {
    if (view !== "upload") return;
    const hasProcessing = tenders.some((t) => t.status === "processing");
    if (!hasProcessing) return;

    const timer = setTimeout(() => {
      loadTenders(false).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [view, tenders, loadTenders]);

  // Hydrate summary counts for completed tenders shown in Recent analyses
  useEffect(() => {
    if (view !== "upload") return;
    const missing = tenders
      .filter((t) => t.status === "completed" && !summaries[t.id])
      .slice(0, 5);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const t of missing) {
        if (cancelled) break;
        try {
          const resp = await fetch(`${API_BASE}/api/tenders/${t.id}`);
          if (!resp.ok) continue;
          const data = (await resp.json()) as TenderDetailResponse;
          if (!cancelled && data.assessment?.summary) {
            setSummaries((prev) => ({
              ...prev,
              [t.id]: data.assessment!.summary,
            }));
          }
        } catch {
          // Ignore background summary hydration errors
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [view, tenders, summaries]);

  const handleNavigate = (nav: NavSection) => {
    setActiveNav(nav);
    if (nav === "tender") {
      setView(selectedId ? "review" : "upload");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setView("company");
    if (nav === "library") {
      setTimeout(() => {
        const el = document.getElementById("document-library");
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSelectTender = (id: string) => {
    setSelectedId(id);
    setView("review");
    setActiveNav("tender");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartNewUpload = () => {
    setSelectedId(null);
    setDetail(null);
    setView("upload");
    setActiveNav("tender");
    setUploadError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDismissFailed = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleUpload = async (file: File, title: string): Promise<boolean> => {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title);

      const resp = await fetch(`${API_BASE}/api/tenders`, {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        const msg = await extractErrorMessage(resp, "Upload failed");
        setUploadError(msg);
        return false;
      }

      const data = (await resp.json()) as { id: string; status: string };
      await loadTenders(false);
      setSelectedId(data.id);
      setView("review");
      setActiveNav("tender");
      return true;
    } catch {
      setUploadError(
        "Network error during upload. Check that the backend server is running."
      );
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleResolved = (updated: ComplianceResult) => {
    if (!selectedId) return;
    loadTenderDetail(selectedId).catch(() => {
      setDetail((prev) => {
        if (!prev?.assessment) return prev;
        return {
          ...prev,
          assessment: {
            ...prev.assessment,
            results: prev.assessment.results.map((r) =>
              r.requirement_id === updated.requirement_id ? updated : r
            ),
          },
        };
      });
    });
  };

  const defaultAttester =
    profile?.contact?.contact_person || "Tender Executive";

  // Breadcrumb & top-right ID
  const breadcrumbSection = view === "company" ? "Company" : "Tenders";
  const breadcrumbPage =
    view === "company"
      ? activeNav === "library"
        ? "Document library"
        : "Profile"
      : view === "review" && detail
        ? detail.tender.title
        : "New analysis";
  const rightId =
    view === "company"
      ? profile?.company_id || null
      : view === "review" && detail
        ? detail.tender.id
        : null;

  // Low quality pages details
  const lowQualityPages = detail?.extraction?.low_quality_pages || [];
  const lowQualityReqIds =
    detail?.extraction?.requirements
      .filter(
        (r) => r.source_page !== null && lowQualityPages.includes(r.source_page)
      )
      .map((r) => r.id) || [];

  return (
    <AppShell
      activeNav={activeNav}
      onNavigate={handleNavigate}
      breadcrumbSection={breadcrumbSection}
      breadcrumbPage={breadcrumbPage}
      rightId={rightId}
      profile={profile}
      loadingProfile={initialLoading}
      apiError={apiError}
    >
      {/* Initial Loading Skeleton */}
      {initialLoading ? (
        <div
          className="space-y-6 animate-pulse"
          aria-busy="true"
          aria-label="Loading TenderMate workspace"
        >
          <div className="space-y-2">
            <div className="h-7 w-72 rounded bg-[var(--tm-skeleton)]" />
            <div className="h-4 w-96 max-w-full rounded bg-[var(--tm-skeleton-soft)]" />
          </div>
          <div className="tm-card p-6 space-y-4">
            <div className="h-40 w-full rounded-[10px] bg-[var(--tm-skeleton-soft)]" />
            <div className="h-10 w-full rounded-[8px] bg-[var(--tm-skeleton-soft)]" />
          </div>
        </div>
      ) : (
        <>
          {/* Company Profile / Document Library View */}
          {view === "company" && (
            <CompanyView profile={profile} loading={initialLoading} />
          )}

          {/* Upload View — page header above balanced 12-column desktop split */}
          {view === "upload" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-medium text-[var(--tm-text-primary)] leading-[1.2]">
                  New tender analysis
                </h1>
                <p className="mt-2 text-sm text-[var(--tm-text-secondary)] leading-relaxed max-w-[600px]">
                  Upload a tender PDF to extract every mandatory requirement with
                  its page citation, check it against your confirmed profile, and
                  flag disqualifying gaps.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 min-w-0">
                  <UploadZone
                    onUpload={handleUpload}
                    uploading={uploading}
                    error={uploadError}
                    onClearError={() => setUploadError(null)}
                  />
                </div>
                <div className="lg:col-span-5 min-w-0">
                  <TenderList
                    tenders={tenders}
                    summaries={summaries}
                    dismissedIds={dismissedIds}
                    loading={initialLoading}
                    onSelect={handleSelectTender}
                    onDismiss={handleDismissFailed}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tender Review View */}
          {view === "review" && (
            <div className="space-y-6">
              {loadingDetail && !detail ? (
                <div
                  className="space-y-6 animate-pulse"
                  aria-busy="true"
                  aria-label="Loading tender review"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="h-7 w-72 rounded bg-[var(--tm-skeleton)]" />
                      <div className="h-4 w-56 rounded bg-[var(--tm-skeleton-soft)]" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-9 w-36 rounded-[8px] bg-[var(--tm-skeleton-soft)]" />
                      <div className="h-9 w-28 rounded-[8px] bg-[var(--tm-skeleton-soft)]" />
                      <div className="h-9 w-36 rounded-[8px] bg-[var(--tm-skeleton)]" />
                    </div>
                  </div>
                  <div className="tm-card p-6 space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="h-14 rounded bg-[var(--tm-skeleton-soft)]" />
                      <div className="h-14 rounded bg-[var(--tm-skeleton-soft)]" />
                      <div className="h-14 rounded bg-[var(--tm-skeleton-soft)]" />
                      <div className="h-14 rounded bg-[var(--tm-skeleton-soft)]" />
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--tm-skeleton)]" />
                  </div>
                  <div className="tm-card p-6 space-y-3">
                    <div className="h-8 w-full rounded bg-[var(--tm-skeleton-soft)]" />
                    <div className="h-12 w-full rounded bg-[var(--tm-skeleton-soft)]" />
                    <div className="h-12 w-full rounded bg-[var(--tm-skeleton-soft)]" />
                    <div className="h-12 w-full rounded bg-[var(--tm-skeleton-soft)]" />
                  </div>
                </div>
              ) : detail ? (
                <>
                  {/* Tender Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h1 className="text-2xl font-medium text-[var(--tm-text-primary)] leading-[1.2] break-words">
                        {detail.tender.title}
                      </h1>
                      <p className="mt-2 text-[13px] text-[var(--tm-text-secondary)]">
                        {detail.extraction ? (
                          <>
                            <span className="font-mono text-xs text-[var(--tm-text-primary)]">
                              {detail.extraction.page_count}{" "}
                              {detail.extraction.page_count === 1
                                ? "page"
                                : "pages"}
                            </span>{" "}
                            · {formatLanguages(detail.extraction.requirements)}{" "}
                            · analysed{" "}
                            {formatDateShort(
                              detail.assessment?.evaluated_at ||
                                detail.tender.completed_at ||
                                detail.tender.created_at
                            )}
                          </>
                        ) : (
                          <>
                            <span className="font-mono text-xs text-[var(--tm-text-primary)]">
                              {detail.tender.id}
                            </span>{" "}
                            · uploaded{" "}
                            {formatDateShort(detail.tender.created_at)}
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleStartNewUpload}
                        className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--tm-border-strong)] bg-[var(--tm-surface)] px-3 text-[13px] font-medium text-[var(--tm-text-primary)] transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--tm-raised)] active:scale-[0.98]"
                      >
                        <PlusIcon className="h-4 w-4 text-[var(--tm-text-muted)]" />
                        <span>Upload new tender</span>
                      </button>

                      <a
                        href={`${API_BASE}/api/tenders/${detail.tender.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--tm-border-strong)] bg-[var(--tm-surface)] px-3 text-[13px] font-medium text-[var(--tm-text-primary)] transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--tm-raised)] active:scale-[0.98]"
                      >
                        <span>Source PDF</span>
                        <ArrowUpRightIcon className="h-3.5 w-3.5 text-[var(--tm-text-muted)]" />
                      </a>

                      {detail.tender.status === "completed" && (
                        <a
                          href={`${API_BASE}/api/tenders/${detail.tender.id}/report.pdf`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--tm-btn-primary-bg)] px-4 text-[13px] font-medium text-[var(--tm-btn-primary-text)] transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--tm-btn-primary-hover)] active:scale-[0.98]"
                        >
                          <DownloadIcon className="h-4 w-4" />
                          <span>Export PDF report</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Processing State */}
                  {detail.tender.status === "processing" && (
                    <div aria-live="polite" className="tm-card p-6 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-medium text-[var(--tm-text-primary)]">
                          Analysing tender PDF
                        </h2>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--tm-accent)]">
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-[var(--tm-accent)]"
                            aria-hidden="true"
                          />
                          Processing
                        </span>
                      </div>
                      <div
                        className="h-2 w-full overflow-hidden rounded-full bg-[var(--tm-raised)]"
                        role="progressbar"
                        aria-label="Analysing tender PDF"
                      >
                        <div className="h-full w-1/3 rounded-full bg-[var(--tm-accent)] tm-progress-indeterminate" />
                      </div>
                      <p className="text-[13px] text-[var(--tm-text-secondary)]">
                        Reading pages and extracting requirements… This page
                        updates automatically every 2 seconds.
                      </p>
                    </div>
                  )}

                  {/* Failed State */}
                  {detail.tender.status === "failed" && (
                    <div
                      role="alert"
                      className="rounded-r-[10px] border border-[var(--tm-gap-border)] border-l-2 border-l-[var(--tm-gap)] bg-[var(--tm-gap-soft)] p-5 space-y-3 text-[var(--tm-gap-text)]"
                    >
                      <h2 className="text-sm font-medium">Analysis failed</h2>
                      <p className="text-[13px] break-words">
                        {detail.tender.error ||
                          "Extraction failed. Please upload a clearer PDF."}
                      </p>
                      <div>
                        <button
                          type="button"
                          onClick={handleStartNewUpload}
                          className="inline-flex h-8 items-center rounded-[8px] border border-[var(--tm-gap-border)] bg-[var(--tm-surface)] px-3 text-xs font-medium text-[var(--tm-gap-text)] transition-colors duration-150 hover:bg-[var(--tm-gap-soft)]"
                        >
                          Upload another PDF
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Summary Panel */}
                  {detail.assessment && (
                    <SummaryPanel assessment={detail.assessment} />
                  )}

                  {/* Low-Quality / OCR Pages Callout — left dossier rule */}
                  {lowQualityPages.length > 0 && (
                    <div
                      role="note"
                      className="rounded-r-[10px] border border-[var(--tm-review-border)] border-l-2 border-l-[var(--tm-review)] bg-[var(--tm-review-soft)] px-4 py-3 text-[13px] text-[var(--tm-text-primary)] flex flex-wrap items-center gap-x-3 gap-y-1.5"
                    >
                      <WarningIcon className="h-4 w-4 shrink-0 text-[var(--tm-review)]" />
                      <span className="text-[var(--tm-text-secondary)]">
                        {lowQualityPages.length === 1
                          ? `Page ${lowQualityPages[0]} is a scanned image read with OCR.`
                          : `Pages ${lowQualityPages.join(", ")} are scanned images read with OCR.`}{" "}
                        {lowQualityReqIds.length > 0
                          ? `Check ${lowQualityReqIds.join(", ")} against the original.`
                          : "Verify extracted items against the original document."}
                      </span>
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {lowQualityPages.map((p) => (
                          <a
                            key={p}
                            href={`${API_BASE}/api/tenders/${detail.tender.id}/pdf#page=${p}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 rounded-[4px] px-1.5 py-0.5 font-mono text-xs font-medium text-[var(--tm-accent)] transition-colors duration-150 hover:bg-[var(--tm-accent-soft)]"
                          >
                            <span>View p.{p}</span>
                            <ArrowUpRightIcon className="h-3.5 w-3.5" />
                          </a>
                        ))}
                      </span>
                    </div>
                  )}

                  {/* Requirements Table */}
                  {detail.extraction && detail.assessment && (
                    <RequirementTable
                      tenderId={detail.tender.id}
                      requirements={detail.extraction.requirements}
                      assessment={detail.assessment}
                      lowQualityPages={lowQualityPages}
                      defaultAttester={defaultAttester}
                      onResolved={handleResolved}
                    />
                  )}
                </>
              ) : (
                <div className="tm-card p-10 text-center space-y-4">
                  <p className="text-sm text-[var(--tm-text-muted)]">
                    No tender selected
                  </p>
                  <button
                    type="button"
                    onClick={handleStartNewUpload}
                    className="inline-flex h-9 items-center justify-center rounded-[8px] bg-[var(--tm-btn-primary-bg)] px-4 text-[13px] font-medium text-[var(--tm-btn-primary-text)] transition-[color,background-color,transform] duration-150 hover:bg-[var(--tm-btn-primary-hover)] active:scale-[0.98]"
                  >
                    Upload a tender PDF
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
