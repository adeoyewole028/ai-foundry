"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, Lock, X } from "lucide-react";
import type { LessonMeta, ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import type { ProjectSubmission } from "@/lib/supabase/project-submissions";
import {
  getCurriculumProgress,
  getLessonAccessState,
  lessonProgressEventName,
  readLessonProgress
} from "@/lib/lesson-progress";
import { getModulePrerequisiteState } from "@/lib/curriculum-prerequisites";

type ResourceItem = LessonMeta & {
  moduleTitle: string;
  moduleSlug: string;
};

type ResourceIndexListProps = {
  items: ResourceItem[];
  modules: ModuleMeta[];
  initialProgress?: LessonProgressState;
  type: "quiz" | "project";
  projectSubmissions?: ProjectSubmission[];
};

type PendingRedirect = {
  href: string;
  itemTitle: string;
  moduleTitle: string;
  lockedCopy: string;
};

export function ResourceIndexList({
  items,
  modules,
  initialProgress = {},
  type,
  projectSubmissions = []
}: ResourceIndexListProps) {
  const [progress, setProgress] = useState<LessonProgressState>(initialProgress);
  const [pendingRedirect, setPendingRedirect] = useState<PendingRedirect | null>(null);

  useEffect(() => {
    const refresh = () => {
      setProgress({
        ...initialProgress,
        ...readLessonProgress()
      });
    };

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(lessonProgressEventName, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(lessonProgressEventName, refresh);
    };
  }, [initialProgress]);

  const moduleBySlug = useMemo(
    () => new Map(modules.map((module) => [module.slug, module])),
    [modules]
  );
  const curriculumProgress = useMemo(
    () => getCurriculumProgress(modules, progress),
    [modules, progress]
  );
  const Icon = type === "quiz" ? CheckCircle2 : ClipboardList;
  const projectSubmissionByLesson = useMemo(() => {
    if (type !== "project" || projectSubmissions.length === 0) {
      return new Map<string, ProjectSubmission>();
    }

    return new Map(
      projectSubmissions.map((submission) => [
        `${submission.moduleSlug}::${submission.lessonSlug}`,
        submission
      ])
    );
  }, [type, projectSubmissions]);

  return (
    <>
      <div className="mt-8 grid gap-4">
        {items.map((item) => {
        const module = moduleBySlug.get(item.moduleSlug);
        const moduleAccessState = module
          ? getModulePrerequisiteState({
              modules,
              moduleSlug: module.slug,
              progress
            })
          : null;
        const isModuleUnlocked = moduleAccessState ? !moduleAccessState.arePrerequisitesLocked : false;
        const accessState = module
          ? getLessonAccessState(module, item.slug, progress)
          : null;
        const isUnlocked = isModuleUnlocked && (accessState?.isUnlocked ?? false);
        const requiredLesson = accessState?.requiredLesson ?? null;
        const globalNextLesson = curriculumProgress.nextLesson;
        const lessonKey = `${item.moduleSlug}::${item.slug}`;
        const projectSubmission =
          type === "project" ? projectSubmissionByLesson.get(lessonKey) : null;
        const href = isUnlocked
          ? `/curriculum/${item.moduleSlug}/${item.slug}`
          : !isModuleUnlocked && globalNextLesson
            ? `/curriculum/${globalNextLesson.moduleSlug}/${globalNextLesson.lessonSlug}`
            : requiredLesson
            ? `/curriculum/${item.moduleSlug}/${requiredLesson.slug}`
            : `/curriculum/${item.moduleSlug}`;
        const lockedCopy =
          !isModuleUnlocked && globalNextLesson
            ? `Locked. Continue your path with "${globalNextLesson.lessonTitle}" first.`
            : requiredLesson
              ? `Locked. Continue with "${requiredLesson.title}" first.`
              : "Locked. Open the module to continue in order.";
        const cardClassName = `flex w-full gap-4 rounded-lg border p-5 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          isUnlocked
            ? "border-rule bg-surface hover:border-accent/50"
            : "border-rule bg-surface/70 opacity-85 hover:border-accent/40"
        }`;
        const cardContent = (
          <>
            {isUnlocked ? (
              <Icon className="mt-1 size-5 shrink-0 text-accent" aria-hidden="true" />
            ) : (
              <Lock className="mt-1 size-5 shrink-0 text-ink-soft" aria-hidden="true" />
            )}
            <span className="min-w-0">
              <span className="block text-lg font-bold text-ink">{item.title}</span>
              <span className="mt-1 block font-mono text-sm text-ink-soft">
                {item.moduleTitle}
              </span>
              <span className="mt-3 block text-sm leading-6 text-ink-soft">
                {type === "project" && projectSubmission
                  ? "Project already submitted. Update your submission in this lesson."
                  : isUnlocked
                    ? item.description
                    : lockedCopy}
              </span>
              {type === "project" && projectSubmission ? (
                <span className="mt-2 block text-sm text-accent">
                  Status: {projectSubmission.status}
                </span>
              ) : null}
            </span>
          </>
        );

        return isUnlocked ? (
          <Link
            className={cardClassName}
            href={href}
            key={`${item.moduleSlug}-${item.slug}`}
          >
            {cardContent}
          </Link>
        ) : (
          <button
            className={cardClassName}
            key={`${item.moduleSlug}-${item.slug}`}
            onClick={() =>
              setPendingRedirect({
                href,
                itemTitle: item.title,
                moduleTitle: item.moduleTitle,
                lockedCopy
              })
            }
            type="button"
          >
            {cardContent}
          </button>
        );
      })}
      </div>

      {pendingRedirect ? (
        <div
          aria-labelledby="locked-resource-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/30 px-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-lg border border-rule bg-surface p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                <Lock className="size-4" aria-hidden="true" />
                Locked {type}
              </div>
              <button
                aria-label="Close"
                className="inline-flex size-9 items-center justify-center rounded-full border border-rule bg-paper text-ink-soft transition hover:border-accent/50 hover:text-ink"
                onClick={() => setPendingRedirect(null)}
                type="button"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <h2 id="locked-resource-title" className="mt-3 text-2xl font-black tracking-[-0.03em] text-ink">
              Continue in order
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              <span className="font-semibold text-ink">{pendingRedirect.itemTitle}</span> in{" "}
              <span className="font-semibold text-ink">{pendingRedirect.moduleTitle}</span> is not unlocked yet.
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{pendingRedirect.lockedCopy}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="inline-flex min-h-11 items-center rounded-full border border-rule bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent/50"
                onClick={() => setPendingRedirect(null)}
                type="button"
              >
                Cancel
              </button>
              <Link
                className="inline-flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition"
                href={pendingRedirect.href}
                style={{
                  backgroundColor: "var(--color-ink)",
                  color: "white"
                }}
              >
                <span>Continue</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
