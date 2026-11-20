"use client";

import {
  CompanyDocument,
  CompanyProfile,
  formatDateShort,
  formatDocumentType,
} from "@/lib/types";
import { CheckIcon } from "./Icons";

interface CompanyViewProps {
  profile: CompanyProfile | null;
  loading?: boolean;
}

function ConfirmationStatus({
  confirmed,
  short = false,
}: {
  confirmed: boolean;
  short?: boolean;
}) {
  if (confirmed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--tm-rule-text)] whitespace-nowrap">
        <CheckIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{short ? "Confirmed" : "User-confirmed"}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--tm-review-text)] whitespace-nowrap">
      <span
        className="h-1.5 w-1.5 rounded-full bg-[var(--tm-review)]"
        aria-hidden="true"
      />
      <span>Unconfirmed</span>
    </span>
  );
}

function formatValidityRange(
  from: string | null | undefined,
  until: string | null | undefined
): string {
  if (from && until) {
    return `${formatDateShort(from)} – ${formatDateShort(until)}`;
  }
  if (from) return `From ${formatDateShort(from)}`;
  if (until) return `Until ${formatDateShort(until)}`;
  return "—";
}

function formatDocValidity(
  doc: CompanyDocument,
  financialsAsOf?: string | null
): string {
  if (doc.valid_from && doc.valid_until) {
    return `${formatDateShort(doc.valid_from)} – ${formatDateShort(doc.valid_until)}`;
  }
  if (doc.valid_from) return `As of ${formatDateShort(doc.valid_from)}`;
  if (doc.valid_until) return `Until ${formatDateShort(doc.valid_until)}`;
  if (
    (doc.document_type === "paid_up_capital" ||
      doc.document_type === "paid_up_capital_statement" ||
      doc.document_type === "financial_statement") &&
    financialsAsOf
  ) {
    return `As of ${formatDateShort(financialsAsOf)}`;
  }
  return "—";
}

export function CompanyView({ profile, loading = false }: CompanyViewProps) {
  if (loading && !profile) {
    return (
      <div
        className="space-y-6 animate-pulse"
        aria-busy="true"
        aria-label="Loading company profile"
      >
        <div className="space-y-2">
          <div className="h-7 w-80 rounded bg-[var(--tm-skeleton)]" />
          <div className="h-4 w-64 rounded bg-[var(--tm-skeleton-soft)]" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tm-card p-5 space-y-3">
              <div className="h-3 w-16 rounded bg-[var(--tm-skeleton)]" />
              <div className="h-6 w-28 rounded bg-[var(--tm-skeleton)]" />
              <div className="h-3.5 w-36 rounded bg-[var(--tm-skeleton-soft)]" />
            </div>
          ))}
        </div>
        <div className="tm-card p-5 space-y-3">
          <div className="h-5 w-40 rounded bg-[var(--tm-skeleton)]" />
          <div className="h-10 w-full rounded bg-[var(--tm-skeleton-soft)]" />
          <div className="h-10 w-full rounded bg-[var(--tm-skeleton-soft)]" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="tm-card p-8 text-center text-sm text-[var(--tm-text-muted)]">
        Company profile could not be loaded · check that the backend server is
        running
      </div>
    );
  }

  const ssmFlag = profile.status_flags?.ssm_active;

  return (
    <div className="space-y-6">
      {/* Header + quiet archival source note */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-[var(--tm-text-primary)] leading-[1.2]">
            {profile.name}
          </h1>
          <p className="mt-2 text-[13px] text-[var(--tm-text-secondary)]">
            <span className="font-mono text-xs text-[var(--tm-text-primary)]">
              {profile.registration_number}
            </span>
            {profile.confirmed_at && (
              <> · confirmed {formatDateShort(profile.confirmed_at)}</>
            )}
          </p>
        </div>

        <p className="text-xs text-[var(--tm-text-muted)] max-w-[440px]">
          Evaluations use this live profile · edit in{" "}
          <code className="rounded-[4px] bg-[var(--tm-raised)] px-1.5 py-0.5 font-mono text-[var(--tm-text-primary)]">
            data/company_profile.json
          </code>
        </p>
      </div>

      {/* Four Credential Dossier Cards */}
      <section
        aria-label="Company credentials"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* CIDB */}
        <article className="tm-card p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-medium text-[var(--tm-text-muted)]">
                CIDB
              </h2>
              <ConfirmationStatus
                confirmed={Boolean(profile.cidb?.user_confirmed)}
                short
              />
            </div>
            <div className="mt-3 text-xl font-medium text-[var(--tm-text-primary)]">
              {profile.cidb?.grade
                ? `Grade ${profile.cidb.grade}`
                : "Not recorded"}
            </div>
            {profile.cidb && profile.cidb.categories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.cidb.categories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-[4px] border border-[var(--tm-border)] bg-[var(--tm-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--tm-text-primary)]"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
          {profile.cidb && (
            <div className="border-t border-[var(--tm-border-subtle)] pt-3 text-xs text-[var(--tm-text-muted)]">
              {formatValidityRange(
                profile.cidb.valid_from,
                profile.cidb.valid_until
              )}
            </div>
          )}
        </article>

        {/* MOF */}
        <article className="tm-card p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-medium text-[var(--tm-text-muted)]">
                MOF
              </h2>
              <ConfirmationStatus
                confirmed={Boolean(profile.mof?.user_confirmed)}
                short
              />
            </div>
            <div className="mt-3 text-xl font-medium text-[var(--tm-text-primary)]">
              {profile.mof
                ? `${profile.mof.codes.length} ${
                    profile.mof.codes.length === 1 ? "code" : "codes"
                  }`
                : "Not recorded"}
            </div>
            {profile.mof && profile.mof.codes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.mof.codes.map((code) => (
                  <span
                    key={code}
                    className="rounded-[4px] border border-[var(--tm-border)] bg-[var(--tm-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--tm-text-primary)]"
                  >
                    {code}
                  </span>
                ))}
              </div>
            )}
          </div>
          {profile.mof && (
            <div className="border-t border-[var(--tm-border-subtle)] pt-3 text-xs text-[var(--tm-text-muted)]">
              {formatValidityRange(
                profile.mof.valid_from,
                profile.mof.valid_until
              )}
            </div>
          )}
        </article>

        {/* Bumiputera */}
        <article className="tm-card p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-medium text-[var(--tm-text-muted)]">
                Bumiputera
              </h2>
              <ConfirmationStatus
                confirmed={Boolean(profile.bumiputera?.user_confirmed)}
                short
              />
            </div>
            <div className="mt-3 text-xl font-medium text-[var(--tm-text-primary)]">
              {profile.bumiputera?.status === true
                ? "Registered"
                : profile.bumiputera?.status === false
                  ? "Not registered"
                  : "Not recorded"}
            </div>
            {ssmFlag && (
              <p className="mt-3 text-xs text-[var(--tm-text-secondary)]">
                {ssmFlag.value === true
                  ? "SSM active"
                  : ssmFlag.value === false
                    ? "SSM inactive"
                    : "SSM status unknown"}
              </p>
            )}
          </div>
          {profile.bumiputera && (
            <div className="border-t border-[var(--tm-border-subtle)] pt-3 text-xs text-[var(--tm-text-muted)]">
              {formatValidityRange(
                profile.bumiputera.valid_from,
                profile.bumiputera.valid_until
              )}
            </div>
          )}
        </article>

        {/* Paid-up Capital */}
        <article className="tm-card p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-medium text-[var(--tm-text-muted)]">
                Paid-up capital
              </h2>
              <ConfirmationStatus
                confirmed={Boolean(profile.financials?.user_confirmed)}
                short
              />
            </div>
            <div className="mt-3 text-xl font-medium text-[var(--tm-text-primary)] tabular-nums">
              {profile.financials?.paid_up_capital_rm !== null &&
              profile.financials?.paid_up_capital_rm !== undefined
                ? `RM ${profile.financials.paid_up_capital_rm.toLocaleString("en-MY")}`
                : "Not recorded"}
            </div>
            {profile.financials && (
              <p className="mt-3 text-xs text-[var(--tm-text-secondary)]">
                {profile.financials.net_worth_rm !== null &&
                profile.financials.net_worth_rm !== undefined
                  ? `Net worth RM ${profile.financials.net_worth_rm.toLocaleString("en-MY")}`
                  : "Net worth not provided"}
              </p>
            )}
          </div>
          {profile.financials?.as_of && (
            <div className="border-t border-[var(--tm-border-subtle)] pt-3 text-xs text-[var(--tm-text-muted)]">
              As of {formatDateShort(profile.financials.as_of)}
            </div>
          )}
        </article>
      </section>

      {/* Document Library Table */}
      <section
        id="document-library"
        aria-label="Document library"
        className="tm-card overflow-hidden scroll-mt-6"
      >
        <div className="flex items-center justify-between border-b border-[var(--tm-border)] px-5 py-4">
          <h2 className="text-base font-medium text-[var(--tm-text-primary)]">
            Document library
          </h2>
          <span className="font-mono text-xs text-[var(--tm-text-muted)]">
            {profile.documents.length}{" "}
            {profile.documents.length === 1 ? "document" : "documents"}
          </span>
        </div>

        {profile.documents.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[var(--tm-text-muted)]">
            No company documents recorded
          </div>
        ) : (
          <>
            {/* Desktop table (>=768px) — sentence case headers, unified dates */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--tm-border)] bg-[var(--tm-surface-subtle)] text-xs font-medium text-[var(--tm-text-muted)]">
                    <th className="px-5 py-3 font-medium">Reference</th>
                    <th className="px-5 py-3 font-medium">Document</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Validity</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--tm-border)]">
                  {profile.documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="transition-colors duration-150 hover:bg-[var(--tm-hover)]"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-[var(--tm-text-secondary)]">
                        {doc.id}
                      </td>
                      <td className="px-5 py-4 max-w-[440px]">
                        <div className="font-medium text-sm text-[var(--tm-text-primary)]">
                          {doc.title}
                        </div>
                        <div className="mt-1 font-mono text-xs text-[var(--tm-text-muted)] break-words">
                          {doc.filename}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[13px] text-[var(--tm-text-secondary)]">
                        {formatDocumentType(doc.document_type)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[13px] text-[var(--tm-text-secondary)] tabular-nums">
                        {formatDocValidity(doc, profile.financials?.as_of)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <ConfirmationStatus
                          confirmed={doc.user_confirmed}
                          short
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked rows (<768px) */}
            <div className="md:hidden divide-y divide-[var(--tm-border)]">
              {profile.documents.map((doc) => (
                <div key={doc.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-[var(--tm-text-secondary)]">
                      {doc.id}
                    </span>
                    <ConfirmationStatus confirmed={doc.user_confirmed} short />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-[var(--tm-text-primary)]">
                      {doc.title}
                    </div>
                    <div className="mt-1 font-mono text-xs text-[var(--tm-text-muted)] break-words">
                      {doc.filename}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--tm-text-secondary)]">
                    <span>{formatDocumentType(doc.document_type)}</span>
                    <span className="tabular-nums">
                      {formatDocValidity(doc, profile.financials?.as_of)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
