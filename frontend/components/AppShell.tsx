"use client";

import React, { useState } from "react";
import { CompanyProfile, DISCLAIMER } from "@/lib/types";
import { LogoMark, MenuIcon, XIcon } from "./Icons";

export type NavSection = "tender" | "company" | "library";

interface AppShellProps {
  activeNav: NavSection;
  onNavigate: (nav: NavSection) => void;
  breadcrumbSection: string;
  breadcrumbPage: string;
  rightId?: string | null;
  profile: CompanyProfile | null;
  loadingProfile?: boolean;
  apiError?: string | null;
  children: React.ReactNode;
}

function buildCredentialSummary(profile: CompanyProfile): string {
  const parts: string[] = [];
  if (profile.cidb?.active) {
    parts.push(profile.cidb.grade ? `CIDB ${profile.cidb.grade}` : "CIDB");
  }
  if (profile.mof?.active) {
    parts.push("MOF");
  }
  if (profile.bumiputera?.status === true) {
    parts.push("Bumiputera");
  }
  return parts.join(" · ");
}

const NAV_ITEMS: { id: NavSection; label: string }[] = [
  { id: "tender", label: "Tender review" },
  { id: "company", label: "Company profile" },
  { id: "library", label: "Document library" },
];

export function AppShell({
  activeNav,
  onNavigate,
  breadcrumbSection,
  breadcrumbPage,
  rightId,
  profile,
  loadingProfile = false,
  apiError,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (nav: NavSection) => {
    setMobileMenuOpen(false);
    onNavigate(nav);
  };

  const credentialSummary = profile ? buildCredentialSummary(profile) : "";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F6F7F9] text-[#101828]">
      {/* Mobile / Tablet (<1024px) dark top header */}
      <div className="flex items-center justify-between bg-[#0B1B33] px-4 h-14 text-white lg:hidden">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight text-white">
            TenderMate
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav-drawer"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="inline-flex items-center justify-center rounded-lg p-2 text-[#B8C4D9] hover:bg-[#1B3157] hover:text-white"
        >
          {mobileMenuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile collapsible nav drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="bg-[#0B1B33] px-4 pb-4 pt-1 border-b border-[#1B3157] lg:hidden"
        >
          <nav aria-label="Primary navigation" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full rounded-lg px-3 py-2 text-left text-[13.5px] font-medium transition-colors ${
                    isActive
                      ? "bg-[#1B3157] text-white"
                      : "text-[#B8C4D9] hover:bg-[#132544] hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
          {profile && (
            <div className="mt-4 border-t border-[#1B3157] pt-3 text-[12px]">
              <div className="font-semibold text-white">{profile.name}</div>
              {credentialSummary && (
                <div className="mt-0.5 text-[#B8C4D9]">{credentialSummary}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Desktop Left Sidebar (>=1024px, 232px wide) */}
      <aside className="hidden lg:flex lg:w-[232px] lg:shrink-0 lg:flex-col lg:justify-between bg-[#0B1B33] text-[#B8C4D9] sticky top-0 h-screen">
        <div>
          <div className="flex items-center gap-2.5 px-5 h-14">
            <LogoMark />
            <span className="text-[15px] font-semibold tracking-tight text-white">
              TenderMate
            </span>
          </div>

          <nav aria-label="Primary navigation" className="mt-3 px-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full rounded-lg px-3 py-2 text-left text-[13.5px] font-medium transition-colors ${
                    isActive
                      ? "bg-[#1B3157] text-white"
                      : "text-[#B8C4D9] hover:bg-[#132544] hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Company summary at bottom of sidebar */}
        <div className="border-t border-[#1B3157]/80 px-5 py-4 text-[12px] leading-snug">
          {loadingProfile && !profile ? (
            <div className="space-y-2 animate-pulse" aria-hidden="true">
              <div className="h-3.5 w-36 rounded bg-[#1B3157]" />
              <div className="h-3 w-28 rounded bg-[#1B3157]/70" />
            </div>
          ) : profile ? (
            <>
              <div className="font-semibold text-white">{profile.name}</div>
              {credentialSummary && (
                <div className="mt-1 text-[#B8C4D9]">{credentialSummary}</div>
              )}
            </>
          ) : (
            <div className="text-[#B8C4D9]">Company profile unavailable</div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar (56px) */}
        <header className="bg-white border-b border-[#E4E7EC]">
          <div className="h-[56px] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 min-w-0 text-[13.5px]">
              <span className="text-[#667085] shrink-0">{breadcrumbSection}</span>
              <span className="text-[#98A2B3] shrink-0" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-[#101828] truncate">
                {breadcrumbPage}
              </span>
            </div>

            {rightId && (
              <span className="font-mono text-[12px] text-[#667085] shrink-0 break-words">
                {rightId}
              </span>
            )}
          </div>

          {/* Mandatory Verbatim Disclaimer Bar */}
          <div
            role="note"
            className="border-t border-[#FDE68A] bg-[#FEF9E7] px-4 py-2 text-center text-[12.5px] font-medium text-[#7A2E0E]"
          >
            {DISCLAIMER}
          </div>
        </header>

        {/* Global Backend-Offline Error Banner */}
        {apiError && (
          <div
            role="alert"
            className="mx-4 sm:mx-6 lg:mx-8 mt-5 rounded-xl border border-[#FDA29B] bg-[#FEF3F2] px-4 py-3 text-[13px] text-[#912018]"
          >
            <strong className="font-semibold">Backend connection issue:</strong>{" "}
            {apiError}
          </div>
        )}

        {/* Screen Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-[1280px]">
          {children}
        </main>
      </div>
    </div>
  );
}
