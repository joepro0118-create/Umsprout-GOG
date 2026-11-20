"use client";

import React, { useState } from "react";
import { CompanyProfile, DISCLAIMER } from "@/lib/types";
import {
  CompanyNavIcon,
  InfoIcon,
  LibraryNavIcon,
  LogoMark,
  MenuIcon,
  TenderNavIcon,
  XIcon,
} from "./Icons";
import { ThemeToggle } from "./ThemeToggle";

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

const WORKSPACE_NAV: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [{ id: "tender", label: "Tender review", icon: TenderNavIcon }];

const COMPANY_NAV: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "company", label: "Company profile", icon: CompanyNavIcon },
  { id: "library", label: "Document library", icon: LibraryNavIcon },
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

  const renderNavItem = (item: {
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => {
    const isActive = activeNav === item.id;
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNavClick(item.id)}
        aria-current={isActive ? "page" : undefined}
        style={
          isActive
            ? {
                backgroundColor: "var(--tm-active-row-bg)",
                boxShadow: "var(--tm-active-row-shadow)",
              }
            : undefined
        }
        className={`flex h-9 w-full items-center gap-2.5 rounded-[8px] px-3 text-left text-sm transition-[color,background-color,border-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isActive
            ? "font-medium text-[var(--tm-text-primary)] border border-[var(--tm-border)]"
            : "border border-transparent font-normal text-[var(--tm-text-secondary)] hover:bg-[var(--tm-hover)] hover:text-[var(--tm-text-primary)]"
        }`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 ${
            isActive
              ? "text-[var(--tm-text-primary)]"
              : "text-[var(--tm-text-muted)]"
          }`}
        />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--tm-bg)] text-[var(--tm-text-primary)]">
      {/* Mobile / Tablet (<1024px) top header */}
      <div className="flex items-center justify-between bg-[var(--tm-sidebar)] border-b border-[var(--tm-border)] px-4 h-14 text-[var(--tm-text-primary)] lg:hidden">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-base font-semibold text-[var(--tm-text-primary)]">
            TenderMate
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--tm-text-secondary)] transition-[color,background-color] duration-150 hover:bg-[var(--tm-hover)] hover:text-[var(--tm-text-primary)]"
          >
            {mobileMenuOpen ? (
              <XIcon className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile collapsible nav drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="bg-[var(--tm-sidebar)] px-4 pb-4 pt-2 border-b border-[var(--tm-border)] lg:hidden"
        >
          <nav aria-label="Primary navigation">
            <div className="px-3 pb-2 pt-2 text-xs font-medium text-[var(--tm-text-muted)]">
              Workspace
            </div>
            <div className="space-y-1">{WORKSPACE_NAV.map(renderNavItem)}</div>

            <div className="mt-6 mb-2 px-3 text-xs font-medium text-[var(--tm-text-muted)]">
              Company
            </div>
            <div className="space-y-1">{COMPANY_NAV.map(renderNavItem)}</div>
          </nav>

          {profile && (
            <div className="mt-6 border-t border-[var(--tm-border)] pt-4 px-3">
              <div className="text-[13px] font-medium text-[var(--tm-text-primary)]">
                {profile.name}
              </div>
              {credentialSummary && (
                <div className="mt-1 font-mono text-xs text-[var(--tm-text-muted)]">
                  {credentialSummary}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Desktop Left Sidebar (>=1024px, 256px wide) */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:justify-between bg-[var(--tm-sidebar)] border-r border-[var(--tm-border)] sticky top-0 h-screen">
        <div>
          <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[var(--tm-border-subtle)]">
            <LogoMark />
            <span className="text-base font-semibold text-[var(--tm-text-primary)]">
              TenderMate
            </span>
          </div>

          <nav aria-label="Primary navigation" className="px-3 pt-4">
            <div className="px-3 mb-2 text-xs font-medium text-[var(--tm-text-muted)]">
              Workspace
            </div>
            <div className="space-y-1">{WORKSPACE_NAV.map(renderNavItem)}</div>

            <div className="mt-6 mb-2 px-3 text-xs font-medium text-[var(--tm-text-muted)]">
              Company
            </div>
            <div className="space-y-1">{COMPANY_NAV.map(renderNavItem)}</div>
          </nav>
        </div>

        {/* Company summary at bottom of sidebar */}
        <div className="border-t border-[var(--tm-border)] p-4 pb-6">
          {loadingProfile && !profile ? (
            <div className="space-y-2 animate-pulse px-1" aria-hidden="true">
              <div className="h-3.5 w-40 rounded bg-[var(--tm-skeleton)]" />
              <div className="h-3 w-32 rounded bg-[var(--tm-skeleton-soft)]" />
            </div>
          ) : profile ? (
            <button
              type="button"
              onClick={() => handleNavClick("company")}
              className="w-full rounded-[8px] p-2 text-left transition-colors duration-150 hover:bg-[var(--tm-hover)]"
            >
              <div className="text-[13px] font-medium text-[var(--tm-text-primary)] leading-snug">
                {profile.name}
              </div>
              {credentialSummary && (
                <div className="mt-1 font-mono text-xs text-[var(--tm-text-muted)]">
                  {credentialSummary}
                </div>
              )}
            </button>
          ) : (
            <div className="px-2 text-xs text-[var(--tm-text-muted)]">
              Company profile unavailable
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar (56px) */}
        <header className="bg-[var(--tm-surface)] border-b border-[var(--tm-border)]">
          <div className="h-14 px-6 lg:px-8 flex items-center justify-between gap-4 max-w-[1440px] mx-auto w-full">
            <div className="flex items-center gap-2 min-w-0 text-sm">
              <span className="text-[var(--tm-text-muted)] shrink-0">
                {breadcrumbSection}
              </span>
              <span
                className="text-[var(--tm-text-faint)] shrink-0"
                aria-hidden="true"
              >
                /
              </span>
              <span className="font-medium text-[var(--tm-text-primary)] truncate">
                {breadcrumbPage}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {rightId && (
                <span className="rounded-[6px] border border-[var(--tm-border)] bg-[var(--tm-raised)] px-2 py-0.5 font-mono text-xs text-[var(--tm-text-secondary)]">
                  {rightId}
                </span>
              )}
              <div className="hidden lg:block">
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Mandatory Verbatim Disclaimer Bar — calm archival presentation */}
          <div
            role="note"
            className="border-t border-[var(--tm-border-subtle)] bg-[var(--tm-surface-subtle)] px-6 py-2"
          >
            <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-2 text-center text-xs text-[var(--tm-text-secondary)]">
              <InfoIcon className="h-3.5 w-3.5 shrink-0 text-[var(--tm-text-muted)]" />
              <span>{DISCLAIMER}</span>
            </div>
          </div>
        </header>

        {/* Global Backend-Offline Error Banner */}
        {apiError && (
          <div className="px-6 lg:px-8 pt-6 max-w-[1440px] mx-auto w-full">
            <div
              role="alert"
              className="rounded-r-[10px] border border-[var(--tm-gap-border)] border-l-2 border-l-[var(--tm-gap)] bg-[var(--tm-gap-soft)] px-4 py-3 text-[13px] text-[var(--tm-gap-text)]"
            >
              <span className="font-medium">Backend connection issue:</span>{" "}
              {apiError}
            </div>
          </div>
        )}

        {/* Screen Content */}
        <main className="flex-1 px-6 lg:px-8 py-8 w-full max-w-[1440px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
