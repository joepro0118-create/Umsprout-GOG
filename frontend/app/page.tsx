"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CompanyProfileView } from "@/components/CompanyProfileView";
import { RequirementCard } from "@/components/RequirementCard";
import {
  API_BASE,
  CompanyProfile,
  ComplianceResult,
  ComplianceStatus,
  DISCLAIMER,
  STATUS_LABELS,
  TenderDetailResponse,
  TenderMeta,
  formatDateTime,
} from "@/lib/types";

type ActiveTab = "tender" | "company";
type StatusFilter = "all" | ComplianceStatus;

export default function HomePage() {
  const [tab, setTab] = useState<ActiveTab>("tender");
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [tenders, setTenders] = useState<TenderMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TenderDetailResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tierBOnly, setTierBOnly] = useState(false);

  const loadTenders = useCallback(async (selectLatest = false) => {
    const resp = await fetch(`${API_BASE}/api/tenders`);
    if (!resp.ok) throw new Error("Failed to load tenders");
    const list = (await resp.json()) as TenderMeta[];
    setTenders(list);
    if (selectLatest && list.length > 0) {
      setSelectedId((prev) => prev || list[0].id);
    }
  }, []);

  const loadTenderDetail = useCallback(async (id: string) => {
    const resp = await fetch(`${API_BASE}/api/tenders/${id}`);
    if (!resp.ok) throw new Error("Failed to load tender detail");
    const data = (await resp.json()) as TenderDetailResponse;
    setDetail(data);
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
        if (!compResp.ok) throw new Error("Failed to load company profile");
        const comp = (await compResp.json()) as CompanyProfile;
        if (active) setProfile(comp);
      } catch {
        if (active) {
          setApiError(
            `Cannot reach FastAPI backend at ${API_BASE}. Start it with: py -m uvicorn api:app --reload --port 8000`
          );
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [loadTenders]);

  // Fetch & poll selected tender while processing
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    async function fetchAndMaybePoll(id: string) {
      try {
        const data = await loadTenderDetail(id);
        if (!cancelled && data.tender.status === "processing") {
          timer = setTimeout(() => fetchAndMaybePoll(id), 2000);
        } else if (!cancelled) {
          loadTenders(false).catch(() => {});
        }
      } catch {
        if (!cancelled) setApiError("Failed to fetch tender status.");
      }
    }

    fetchAndMaybePoll(selectedId);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [selectedId, loadTenderDetail, loadTenders]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    setUploadError(null);
    if (!uploadFile) {
      setUploadError("Select a PDF tender document to upload.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("title", uploadTitle.trim());

      const resp = await fetch(`${API_BASE}/api/tenders`, {
        method: "POST",
        body: fd,
      });
      const data = await resp.json();
      if (!resp.ok) {
        setUploadError(data.detail || "Upload failed.");
        return;
      }

      setUploadFile(null);
      setUploadTitle("");
      await loadTenders(false);
      setSelectedId(data.id);
      setTab("tender");
    } catch {
      setUploadError("Network error during upload.");
    } finally {
      setUploading(false);
    }
  }

  function handleResolved(updated: ComplianceResult) {
    if (!selectedId) return;
    // Refresh from server so summary counts stay authoritative
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
  }

  const reqById = new Map(
    (detail?.extraction?.requirements || []).map((req) => [req.id, req])
  );
  const filteredResults = (detail?.assessment?.results || []).filter((res) => {
    if (statusFilter !== "all" && res.status !== statusFilter) return false;
    if (tierBOnly && !res.is_disqualifying) return false;
    return true;
  });

  const defaultAttester = profile?.contact?.contact_person || "Tender Executive";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">TenderMate</h1>
            <p className="text-xs text-slate-500">
              {profile ? profile.name : "Malaysian SME Tender Readiness Assistant"}
            </p>
          </div>
          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-sm">
            <button
              type="button"
              onClick={() => setTab("tender")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                tab === "tender"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tender Upload &amp; Review
            </button>
            <button
              type="button"
              onClick={() => setTab("company")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                tab === "company"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Company Profile &amp; Library
            </button>
          </nav>
        </div>
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-900">
          {DISCLAIMER}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {apiError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {apiError}
          </div>
        )}

        {tab === "company" ? (
          profile ? (
            <CompanyProfileView profile={profile} />
          ) : (
            <p className="text-sm text-slate-500">Loading company profile...</p>
          )
        ) : (
          <div className="space-y-6">
            {/* Upload + Past Tenders Row */}
            <section className="grid gap-4 md:grid-cols-3">
              <form
                onSubmit={handleUpload}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs md:col-span-2"
              >
                <h2 className="text-sm font-semibold text-slate-900">Upload Tender PDF</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  PDF only. Extracts atomic mandatory conditions with page citations and runs
                  deterministic checks against the company profile.
                </p>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">Tender PDF file</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-xs text-slate-700 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-800 hover:file:bg-slate-200"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">
                      Tender title (optional)
                    </span>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. JKR Building Maintenance 2026"
                      className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </label>
                </div>

                {uploadError && (
                  <p className="mt-2 rounded bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
                    {uploadError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={uploading}
                  className="mt-3 rounded-md bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Analyze Tender PDF"}
                </button>
              </form>

              {/* Recent Tenders */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
                <h2 className="text-sm font-semibold text-slate-900">Analyses ({tenders.length})</h2>
                {tenders.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    No tenders uploaded yet. Upload a PDF to begin.
                  </p>
                ) : (
                  <ul className="mt-2 max-h-36 space-y-1.5 overflow-y-auto pr-1">
                    {tenders.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(t.id)}
                          className={`w-full rounded-md border px-2.5 py-1.5 text-left text-xs transition ${
                            selectedId === t.id
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                          }`}
                        >
                          <div className="truncate font-semibold">{t.title}</div>
                          <div
                            className={`flex justify-between text-[11px] ${
                              selectedId === t.id ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            <span>{t.id}</span>
                            <span>{t.status}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Active Tender Assessment */}
            {detail && (
              <section className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">{detail.tender.title}</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="font-mono">{detail.tender.id}</span> ·{" "}
                        <a
                          href={`${API_BASE}/api/tenders/${detail.tender.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline"
                        >
                          {detail.tender.filename} ↗
                        </a>
                        {detail.extraction && (
                          <>
                            {" "}
                            · {detail.extraction.page_count} pages · Model:{" "}
                            <span className="font-mono">{detail.extraction.model_used}</span>
                          </>
                        )}
                      </p>
                      {detail.assessment && (
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Evaluated: {formatDateTime(detail.assessment.evaluated_at)}
                        </p>
                      )}
                    </div>

                    {detail.tender.status === "completed" && (
                      <a
                        href={`${API_BASE}/api/tenders/${detail.tender.id}/report.pdf`}
                        className="inline-flex items-center rounded-md bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                      >
                        Export PDF Report
                      </a>
                    )}
                  </div>

                  {detail.tender.status === "processing" && (
                    <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                      Extracting requirements and running deterministic checks... This page updates
                      automatically.
                    </div>
                  )}

                  {detail.tender.status === "failed" && (
                    <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <strong>Analysis failed:</strong> {detail.tender.error}
                    </div>
                  )}

                  {detail.extraction && detail.extraction.low_quality_pages.length > 0 && (
                    <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                      <strong>Low-quality / scanned page warning:</strong> Page(s){" "}
                      {detail.extraction.low_quality_pages.join(", ")} could not be reliably read
                      and require manual verification against the source PDF.
                    </div>
                  )}

                  {/* Summary Strip */}
                  {detail.assessment && (
                    <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                        <div className="text-[11px] uppercase text-slate-500">Total</div>
                        <div className="mt-0.5 text-xl font-bold text-slate-900">
                          {detail.assessment.summary.total_requirements}
                        </div>
                      </div>
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2.5">
                        <div className="text-[11px] font-semibold uppercase text-emerald-800">
                          Rule-checked
                        </div>
                        <div className="mt-0.5 text-xl font-bold text-emerald-700">
                          {detail.assessment.summary.matched_rule_verified}
                        </div>
                      </div>
                      <div className="rounded-md border border-dashed border-blue-300 bg-blue-50 p-2.5">
                        <div className="text-[11px] font-semibold uppercase text-blue-800">
                          User-evidenced
                        </div>
                        <div className="mt-0.5 text-xl font-bold text-blue-700">
                          {detail.assessment.summary.matched_user_evidenced}
                        </div>
                      </div>
                      <div className="rounded-md border border-red-200 bg-red-50 p-2.5">
                        <div className="text-[11px] font-semibold uppercase text-red-800">
                          Gap ({detail.assessment.summary.disqualifying_gaps} Tier B)
                        </div>
                        <div className="mt-0.5 text-xl font-bold text-red-700">
                          {detail.assessment.summary.gap}
                        </div>
                      </div>
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5">
                        <div className="text-[11px] font-semibold uppercase text-amber-800">
                          Needs Review
                        </div>
                        <div className="mt-0.5 text-xl font-bold text-amber-800">
                          {detail.assessment.summary.needs_review}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter bar + Requirement List */}
                {detail.assessment && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(
                          [
                            "all",
                            "gap",
                            "needs_review",
                            "matched_rule_verified",
                            "matched_user_evidenced",
                          ] as StatusFilter[]
                        ).map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setStatusFilter(key)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              statusFilter === key
                                ? "bg-slate-900 text-white"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {key === "all" ? "All" : STATUS_LABELS[key]}
                          </button>
                        ))}
                      </div>

                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={tierBOnly}
                          onChange={(e) => setTierBOnly(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        Tier B disqualifying only
                      </label>
                    </div>

                    <div className="space-y-3">
                      {filteredResults.length === 0 ? (
                        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                          No requirements match the current filter.
                        </p>
                      ) : (
                        filteredResults.map((res) => {
                          const req = reqById.get(res.requirement_id);
                          if (!req) return null;
                          return (
                            <RequirementCard
                              key={res.requirement_id}
                              tenderId={detail.tender.id}
                              requirement={req}
                              result={res}
                              defaultAttester={defaultAttester}
                              onResolved={handleResolved}
                            />
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
