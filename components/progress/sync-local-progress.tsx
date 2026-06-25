"use client";

import { useEffect } from "react";
import { syncLocalLessonProgressAction } from "@/app/progress/actions";
import { readLessonProgress } from "@/lib/lesson-progress";

export function SyncLocalProgress() {
  useEffect(() => {
    const sync = async () => {
      const progress = readLessonProgress();

      if (Object.keys(progress).length === 0) {
        return;
      }

      await syncLocalLessonProgressAction(progress);
    };

    void sync();
  }, []);

  return null;
}
