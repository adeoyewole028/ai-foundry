import { ProgressNavButton } from "@/components/layout/progress-nav-button";
import { getModules } from "@/lib/content.server";
import { getCurrentUserLessonProgress } from "@/lib/supabase/progress";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import Link from "next/link";

async function getInitialProgress(moduleSlugs: string[]) {
  if (!isSupabaseConfigured()) {
    return {};
  }

  return getCurrentUserLessonProgress(moduleSlugs);
}

export async function SiteFooter() {
  const modules = await getModules();
  const initialProgress = await getInitialProgress(modules.map((module) => module.slug));

  return (
    <footer className="mx-auto mt-20 flex max-w-6xl flex-col gap-3 border-t border-rule px-4 py-6 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="font-medium text-ink">AI Foundry</p>
      <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2">
        <Link className="hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/curriculum">
          Curriculum
        </Link>
        <ProgressNavButton
          className="hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          href="/quizzes"
          initialProgress={initialProgress}
          modules={modules}
        >
          Quizzes
        </ProgressNavButton>
        <ProgressNavButton
          className="hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          href="/projects"
          initialProgress={initialProgress}
          modules={modules}
        >
          Projects
        </ProgressNavButton>
        <Link
          className="hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          href="/curriculum"
        >
          Learning roadmap
        </Link>
      </nav>
    </footer>
  );
}
