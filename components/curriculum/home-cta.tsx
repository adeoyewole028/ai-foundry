"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import { ButtonLink } from "@/components/ui/button";
import {
  lessonProgressEventName,
  readLessonProgress
} from "@/lib/lesson-progress";
import { getNextLessonHref } from "@/lib/progress-navigation";

type HomeCtaProps = {
  modules: ModuleMeta[];
  initialProgress?: LessonProgressState;
};

export function HomeCta({ modules, initialProgress = {} }: HomeCtaProps) {
  const [progress, setProgress] = useState<LessonProgressState>(initialProgress);

  useEffect(() => {
    const refresh = () => {
      const localProgress = readLessonProgress();

      setProgress({
        ...initialProgress,
        ...localProgress
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

  const { href: ctaHref, isComplete } = useMemo(
    () => getNextLessonHref(modules, progress),
    [modules, progress]
  );
  const ctaCopy = isComplete ? "Browse curriculum" : "Continue learning";

  return (
    <ButtonLink className="gap-2" href={ctaHref}>
      {ctaCopy}
      <ArrowRight className="size-4" aria-hidden="true" />
    </ButtonLink>
  );
}
