 "use client";

import { useEffect } from "react";

type LessonScrollResetProps = {
  lessonSlug: string;
  moduleSlug: string;
};

export function LessonScrollReset({ lessonSlug, moduleSlug }: LessonScrollResetProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const mainContent = document.getElementById("main-content");
    mainContent?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [moduleSlug, lessonSlug]);

  return null;
}
