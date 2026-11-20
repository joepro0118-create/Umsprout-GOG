"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./Icons";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("tm-theme", next ? "dark" : "light");
    } catch {
      // Ignore storage errors in restricted environments
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--tm-border-strong)] bg-[var(--tm-surface)] text-[var(--tm-text-secondary)] transition-[color,background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--tm-raised)] hover:text-[var(--tm-text-primary)] active:scale-[0.97]"
    >
      {mounted ? (
        dark ? (
          <SunIcon className="h-4 w-4" />
        ) : (
          <MoonIcon className="h-4 w-4" />
        )
      ) : (
        <span className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
