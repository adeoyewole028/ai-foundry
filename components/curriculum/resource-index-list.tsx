"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Lock } from "lucide-react";
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
import { ProgressInterruptionModal } from "@/components/curriculum/progress-interruption-modal";

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
  progressHint?: string;
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
  const actionLabel = type === "quiz" ? "Trial" : "Mission";
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
              : "Locked. Open the stage to continue in order.";
        const progressHint = "You can still open this page from the home nav, but this quest unlocks later.";
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
                  ? "Build mission already submitted. Update your submission in this lesson."
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
                lockedCopy,
                progressHint: isModuleUnlocked
                  ? "Complete the required prior quest first to unlock this checkpoint."
                  : "Finish your current active module before opening future module checkpoints."
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
          <ProgressInterruptionModal
            continueHref={pendingRedirect.href}
            continueLabel={`Continue ${actionLabel}`}
            description={`"${pendingRedirect.itemTitle}" in "${pendingRedirect.moduleTitle}" is not unlocked yet.`}
            progressHint={pendingRedirect.progressHint}
            onClose={() => setPendingRedirect(null)}
            open={Boolean(pendingRedirect)}
            supportingText={pendingRedirect.lockedCopy}
            title="Continue your quest path"
        />
      ) : null}
    </>
  );
}
