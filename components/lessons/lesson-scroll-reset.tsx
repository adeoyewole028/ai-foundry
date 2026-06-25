 "use client";

import { useEffect } from "react";

type LessonScrollResetProps = {
  lessonSlug: string;
  moduleSlug: string;
};

export function LessonScrollReset({ lessonSlug, moduleSlug }: LessonScrollResetProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [moduleSlug, lessonSlug]);

  return null;
}
