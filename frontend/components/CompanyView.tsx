"use client";

import {
  CompanyDocument,
  CompanyProfile,
  formatDateShort,
  formatDocumentType,
} from "@/lib/types";

interface CompanyViewProps {
  profile: CompanyProfile | null;
  loading?: boolean;
}

function ConfirmationPill({
  confirmed,
  short = false,
}: {
  confirmed: boolean;
  short?: boolean;
}) {
  if (confirmed) {
    return (
      <span className="inline-flex items-center rounded-md bg-[#E7F6EC] px-2.5 py-0.5 text-[12px] font-semibold text-[#05603A] whitespace-nowrap">
        {short ? "Confirmed" : "User-confirmed"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-[#FEF0C7] px-2.5 py-0.5 text-[12px] font-semibold text-[#7A2E0E] whitespace-nowrap">
      Unconfirmed
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
    return `${doc.valid_from} – ${doc.valid_until}`;
  }
  if (doc.valid_from) return `As of ${doc.valid_from}`;
  if (doc.valid_until) return `Until ${doc.valid_until}`;
  if (
    (doc.document_type === "paid_up_capital" ||
      doc.document_type === "financial_statement") &&
    financialsAsOf
  ) {
    return `As of ${financialsAsOf}`;
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
          <div className="h-7 w-80 rounded bg-[#E4E7EC]" />
          <div className="h-4 w-64 rounded bg-[#E4E7EC]" />
        </div>
        <div className="h-12 w-full rounded-xl bg-[#E4E7EC]/70" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tm-card p-5 space-y-3">
              <div className="h-3 w-16 rounded bg-[#E4E7EC]" />
              <div className="h-6 w-28 rounded bg-[#E4E7EC]" />
              <div className="h-3.5 w-36 rounded bg-[#F2F4F7]" />
              <div className="h-5 w-24 rounded bg-[#F2F4F7]" />
            </div>
          ))}
        </div>
        <div className="tm-card p-5 space-y-3">
          <div className="h-5 w-40 rounded bg-[#E4E7EC]" />
          <div className="h-10 w-full rounded bg-[#F2F4F7]" />
          <div className="h-10 w-full rounded bg-[#F2F4F7]" />
          <div className="h-10 w-full rounded bg-[#F2F4F7]" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="tm-card p-8 text-center text-[13.5px] text-[#667085]">
        Company profile could not be loaded. Check that the backend server is running.
      </div>
    );
  }

  const ssmFlag = profile.status_flags?.ssm_active;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-[#101828]">
          {profile.name}
        </h1>
        <p className="mt-1 text-[13.5px] text-[#667085]">
          <span className="font-mono text-[13px]">{profile.registration_number}</span>
          {profile.confirmed_at && (
            <> · confirmed {formatDateShort(profile.confirmed_at)}</>
          )}
        </p>
      </div>

      {/* Blue Notice Banner */}
      <div className="rounded-xl border border-[#C7D7FE] bg-[#EFF4FF] px-4 py-3 text-[13px] text-[#1E40AF]">
        Results use this profile as it is now. If it changes, earlier tender results
        change when reopened. Edit in{" "}
        <code className="font-mono text-[12.5px] font-medium">
          data/company_profile.json
        </code>
        .
      </div>

      {/* Four Credential Cards */}
      <section
        aria-label="Company credentials"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* CIDB */}
        <article className="tm-card p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
              CIDB
            </h2>
            <div className="text-[18px] font-bold text-[#101828]">
              {profile.cidb?.grade ? `Grade ${profile.cidb.grade}` : "Not recorded"}
            </div>
            {profile.cidb && (
              <div className="space-y-0.5 text-[12.5px] text-[#667085]">
                {profile.cidb.categories.length > 0 && (
                  <p className="font-mono text-[12px] text-[#475467] break-words">
                    {profile.cidb.categories.join(" · ")}
                  </p>
                )}
                <p>
                  {formatValidityRange(
                    profile.cidb.valid_from,
                    profile.cidb.valid_until
                  )}
                </p>
              </div>
            )}
          </div>
          <div>
            <ConfirmationPill confirmed={Boolean(profile.cidb?.user_confirmed)} />
          </div>
        </article>

        {/* MOF */}
        <article className="tm-card p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
              MOF
            </h2>
            <div className="text-[18px] font-bold text-[#101828]">
              {profile.mof
                ? `${profile.mof.codes.length} ${
                    profile.mof.codes.length === 1 ? "code" : "codes"
                  }`
                : "Not recorded"}
            </div>
            {profile.mof && (
              <div className="space-y-0.5 text-[12.5px] text-[#667085]">
                {profile.mof.codes.length > 0 && (
                  <p className="font-mono text-[12px] text-[#475467] break-words">
                    {profile.mof.codes.join(" · ")}
                  </p>
                )}
                <p>
                  {formatValidityRange(
                    profile.mof.valid_from,
                    profile.mof.valid_until
                  )}
                </p>
              </div>
            )}
          </div>
          <div>
            <ConfirmationPill confirmed={Boolean(profile.mof?.user_confirmed)} />
          </div>
        </article>

        {/* Bumiputera */}
        <article className="tm-card p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
              Bumiputera
            </h2>
            <div className="text-[18px] font-bold text-[#101828]">
              {profile.bumiputera?.status === true
                ? "Registered"
                : profile.bumiputera?.status === false
                  ? "Not registered"
                  : "Not recorded"}
            </div>
            <div className="space-y-0.5 text-[12.5px] text-[#667085]">
              {profile.bumiputera && (
                <p>
                  {formatValidityRange(
                    profile.bumiputera.valid_from,
                    profile.bumiputera.valid_until
                  )}
                </p>
              )}
              {ssmFlag && (
                <p className="text-[#475467]">
                  {ssmFlag.value === true
                    ? "SSM active"
                    : ssmFlag.value === false
                      ? "SSM inactive"
                      : "SSM status unknown"}
                </p>
              )}
            </div>
          </div>
          <div>
            <ConfirmationPill
              confirmed={Boolean(profile.bumiputera?.user_confirmed)}
            />
          </div>
        </article>

        {/* Paid-up Capital */}
        <article className="tm-card p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
              Paid-up capital
            </h2>
            <div className="text-[18px] font-bold text-[#101828]">
              {profile.financials?.paid_up_capital_rm !== null &&
              profile.financials?.paid_up_capital_rm !== undefined
                ? `RM ${profile.financials.paid_up_capital_rm.toLocaleString("en-MY")}`
                : "Not recorded"}
            </div>
            {profile.financials && (
              <div className="space-y-0.5 text-[12.5px] text-[#667085]">
                {profile.financials.as_of && (
                  <p>As of {formatDateShort(profile.financials.as_of)}</p>
                )}
                <p>
                  {profile.financials.net_worth_rm !== null &&
                  profile.financials.net_worth_rm !== undefined
                    ? `Net worth RM ${profile.financials.net_worth_rm.toLocaleString("en-MY")}`
                    : "Net worth not provided"}
                </p>
              </div>
            )}
          </div>
          <div>
            <ConfirmationPill
              confirmed={Boolean(profile.financials?.user_confirmed)}
            />
          </div>
        </article>
      </section>

      {/* Document Library Table */}
      <section
        id="document-library"
        aria-label="Document library"
        className="tm-card overflow-hidden scroll-mt-6"
      >
        <div className="border-b border-[#E4E7EC] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[#101828]">
            Document library
          </h2>
        </div>

        {profile.documents.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13.5px] text-[#667085]">
            No company documents recorded.
          </div>
        ) : (
          <>
            {/* Desktop table (>=768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
                    <th className="px-5 py-2.5">Ref</th>
                    <th className="px-5 py-2.5">Document</th>
                    <th className="px-5 py-2.5">Type</th>
                    <th className="px-5 py-2.5">Validity</th>
                    <th className="px-5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EC]">
                  {profile.documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[#F9FAFB]/70">
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[12px] font-medium text-[#475467]">
                        {doc.id}
                      </td>
                      <td className="px-5 py-3.5 max-w-[420px]">
                        <div className="font-medium text-[13.5px] text-[#101828]">
                          {doc.title}
                        </div>
                        <div className="mt-0.5 font-mono text-[12px] text-[#667085] break-words">
                          {doc.filename}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-[#475467]">
                        {formatDocumentType(doc.document_type)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[12.5px] text-[#475467]">
                        {formatDocValidity(doc, profile.financials?.as_of)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <ConfirmationPill confirmed={doc.user_confirmed} short />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked rows (<768px) */}
            <div className="md:hidden divide-y divide-[#E4E7EC]">
              {profile.documents.map((doc) => (
                <div key={doc.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[12px] font-medium text-[#475467]">
                      {doc.id}
                    </span>
                    <ConfirmationPill confirmed={doc.user_confirmed} short />
                  </div>
                  <div>
                    <div className="font-medium text-[13.5px] text-[#101828]">
                      {doc.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[12px] text-[#667085] break-words">
                      {doc.filename}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#667085]">
                    <span>{formatDocumentType(doc.document_type)}</span>
                    <span className="font-mono">
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
