import Link from "next/link";
import { BookOpen, Hammer, LogIn, Menu } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ProgressNavButton } from "@/components/layout/progress-nav-button";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserLessonProgress } from "@/lib/supabase/progress";
import { getModules } from "@/lib/content";

const navItems = [
  { href: "/curriculum", label: "Curriculum" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/projects", label: "Projects" }
];

async function getIsAuthenticated() {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();

    return Boolean(data?.claims);
  } catch {
    return false;
  }
}

async function getInitialProgress(moduleSlugs: string[]) {
  if (!isSupabaseConfigured()) {
    return {};
  }

  return getCurrentUserLessonProgress(moduleSlugs);
}

export async function SiteHeader() {
  const isAuthenticated = await getIsAuthenticated();
  const modules = await getModules();
  const initialProgress = await getInitialProgress(modules.map((module) => module.slug));

  return (
    <header className="fixed left-0 right-0 top-4 z-30 px-3">
      <div className="mx-auto flex min-h-14 max-w-[840px] items-center justify-between gap-3 rounded-full border border-rule bg-paper/85 px-3 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <Link
          className="flex min-h-11 min-w-0 items-center gap-2 rounded-full pl-1 pr-2 font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          href="/"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
            <Hammer className="size-5" aria-hidden="true" />
          </span>
          <span className="truncate">AI Foundry</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium text-ink-soft sm:flex">
          {navItems.map((item) => (
            <ProgressNavButton
              initialProgress={initialProgress}
              key={item.href}
              modules={modules}
              className="rounded-full px-3 py-2 transition hover:bg-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              href={item.href}
            >
              {item.label}
            </ProgressNavButton>
          ))}
        </nav>
        {isAuthenticated ? (
          <ButtonLink className="hidden gap-2 sm:inline-flex" href="/dashboard" variant="secondary">
            <BookOpen className="size-4" aria-hidden="true" />
            Dashboard
          </ButtonLink>
        ) : (
          <ButtonLink className="hidden gap-2 sm:inline-flex" href="/login" variant="secondary">
            <LogIn className="size-4" aria-hidden="true" />
            Log in
          </ButtonLink>
        )}
        <ButtonLink aria-label="Open learner area" className="sm:hidden" href={isAuthenticated ? "/dashboard" : "/login"} variant="secondary">
          <Menu className="size-4" aria-hidden="true" />
        </ButtonLink>
      </div>
    </header>
  );
}
