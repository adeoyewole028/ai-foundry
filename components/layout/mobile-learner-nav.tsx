"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpen, LogIn, Menu, X } from "lucide-react";
import { ProgressNavButton } from "@/components/layout/progress-nav-button";
import type { ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";

type MobileNavItem = {
  href: string;
  label: string;
};

type MobileLearnerNavProps = {
  navItems: MobileNavItem[];
  modules: ModuleMeta[];
  isAuthenticated: boolean;
  initialProgress: LessonProgressState;
};

export function MobileLearnerNav({
  navItems,
  modules,
  isAuthenticated,
  initialProgress
}: MobileLearnerNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

  const focusTarget = containerRef.current?.querySelector<HTMLElement>(
      "a[href], button:not([disabled])"
    );
    focusTarget?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    const handleOutsidePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleOutsidePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleOutsidePointerDown);
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  return (
    <div className="relative sm:hidden" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-controls="mobile-learner-nav"
        aria-label={isOpen ? "Close learner navigation" : "Open learner navigation"}
        className="inline-flex size-10 items-center justify-center rounded-full border border-rule bg-paper text-ink transition hover:border-accent/50"
        onClick={() => setIsOpen((previous) => !previous)}
        ref={triggerRef}
        type="button"
      >
        {isOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
      </button>
      {isOpen ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[200px] rounded-2xl border border-rule bg-surface/95 px-2 py-3 shadow-[var(--shadow-soft)] backdrop-blur-sm"
          id="mobile-learner-nav"
        >
          <nav className="space-y-1">
            {navItems.map((item) => (
              <ProgressNavButton
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink transition hover:bg-muted"
                href={item.href}
                initialProgress={initialProgress}
                key={item.href}
                modules={modules}
                onActivate={() => setIsOpen(false)}
              >
                {item.label}
              </ProgressNavButton>
            ))}
          </nav>
          <div className="mt-2 border-t border-rule pt-2">
            {isAuthenticated ? (
              <Link
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-muted"
                href="/dashboard"
                onClick={() => setIsOpen(false)}
              >
                <BookOpen className="size-4" aria-hidden="true" />
                Dashboard
              </Link>
            ) : (
              <Link
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-muted"
                href="/login"
                onClick={() => setIsOpen(false)}
              >
                <LogIn className="size-4" aria-hidden="true" />
                Log in
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
