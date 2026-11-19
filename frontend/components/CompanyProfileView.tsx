"use client";

import { CompanyProfile, formatDateTime } from "@/lib/types";

interface Props {
  profile: CompanyProfile;
}

function ConfirmedPill({ confirmed }: { confirmed: boolean }) {
  return confirmed ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
      User-confirmed
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
      Unconfirmed
    </span>
  );
}

export function CompanyProfileView({ profile }: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Company Profile (Read-Only Demo Seed)
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{profile.name}</h2>
            <p className="text-sm text-slate-600">
              Reg. No: <span className="font-mono">{profile.registration_number}</span> · ID:{" "}
              <span className="font-mono">{profile.company_id}</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Profile confirmed: {formatDateTime(profile.confirmed_at)}</p>
            <p className="mt-0.5">Edit via data/company_profile.json</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* CIDB */}
          <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">CIDB Registration</h3>
              <ConfirmedPill confirmed={Boolean(profile.cidb?.user_confirmed)} />
            </div>
            {profile.cidb ? (
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Grade</dt>
                  <dd className="font-mono font-semibold text-slate-900">{profile.cidb.grade || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Categories</dt>
                  <dd className="font-mono text-slate-900">
                    {profile.cidb.categories.length ? profile.cidb.categories.join(", ") : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Reg. No</dt>
                  <dd className="font-mono text-slate-700">{profile.cidb.registration_number || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Validity</dt>
                  <dd className="font-mono text-slate-700">
                    {profile.cidb.valid_from || "?"} to {profile.cidb.valid_until || "?"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Evidence Ref</dt>
                  <dd className="font-mono text-slate-700">{profile.cidb.evidence_document_id || "Missing"}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Not recorded.</p>
            )}
          </div>

          {/* MOF */}
          <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">MOF Registration</h3>
              <ConfirmedPill confirmed={Boolean(profile.mof?.user_confirmed)} />
            </div>
            {profile.mof ? (
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-medium text-slate-900">{profile.mof.active ? "Active" : "Inactive"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Field Codes</dt>
                  <dd className="font-mono text-slate-900">
                    {profile.mof.codes.length ? profile.mof.codes.join(", ") : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Reg. No</dt>
                  <dd className="font-mono text-slate-700">{profile.mof.registration_number || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Validity</dt>
                  <dd className="font-mono text-slate-700">
                    {profile.mof.valid_from || "?"} to {profile.mof.valid_until || "?"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Evidence Ref</dt>
                  <dd className="font-mono text-slate-700">{profile.mof.evidence_document_id || "Missing"}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Not recorded.</p>
            )}
          </div>

          {/* Bumiputera */}
          <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Bumiputera Status</h3>
              <ConfirmedPill confirmed={Boolean(profile.bumiputera?.user_confirmed)} />
            </div>
            {profile.bumiputera ? (
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Bumiputera</dt>
                  <dd className="font-medium text-slate-900">
                    {profile.bumiputera.status === true
                      ? "Yes"
                      : profile.bumiputera.status === false
                        ? "No"
                        : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Validity</dt>
                  <dd className="font-mono text-slate-700">
                    {profile.bumiputera.valid_from || "?"} to {profile.bumiputera.valid_until || "?"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Evidence Ref</dt>
                  <dd className="font-mono text-slate-700">
                    {profile.bumiputera.evidence_document_id || "Missing"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Not recorded.</p>
            )}
          </div>

          {/* Financials */}
          <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Financials (Paid-up Capital)</h3>
              <ConfirmedPill confirmed={Boolean(profile.financials?.user_confirmed)} />
            </div>
            {profile.financials ? (
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Paid-up Capital</dt>
                  <dd className="font-mono font-semibold text-slate-900">
                    {profile.financials.paid_up_capital_rm !== null
                      ? `RM ${profile.financials.paid_up_capital_rm.toLocaleString("en-MY")}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Net Worth</dt>
                  <dd className="font-mono text-slate-700">
                    {profile.financials.net_worth_rm !== null
                      ? `RM ${profile.financials.net_worth_rm.toLocaleString("en-MY")}`
                      : "Not recorded"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">As of</dt>
                  <dd className="font-mono text-slate-700">{profile.financials.as_of || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Evidence Ref</dt>
                  <dd className="font-mono text-slate-700">
                    {profile.financials.evidence_document_id || "Missing"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Not recorded.</p>
            )}
          </div>
        </div>
      </section>

      {/* Read-only Document Library */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Company Document Library</h3>
            <p className="text-xs text-slate-500">
              Reusable evidence records linked to deterministic compliance checks (read-only).
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {profile.documents.length} documents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Ref ID</th>
                <th className="px-3 py-2">Document</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Validity</th>
                <th className="px-3 py-2">Confirmation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profile.documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-semibold text-slate-700">
                    {doc.id}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-900">{doc.title}</div>
                    <div className="font-mono text-xs text-slate-500">{doc.filename}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                    {doc.document_type.replaceAll("_", " ")}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">
                    {doc.valid_from || "—"} → {doc.valid_until || "No expiry"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <ConfirmedPill confirmed={doc.user_confirmed} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
