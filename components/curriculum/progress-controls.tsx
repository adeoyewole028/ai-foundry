"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { resetLessonProgress } from "@/lib/lesson-progress";

export function ProgressControls() {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = () => {
    const confirmed = window.confirm("Clear all lesson completion and checklist progress?");

    if (!confirmed) {
      return;
    }

    setIsResetting(true);
    resetLessonProgress();
    setTimeout(() => {
      setIsResetting(false);
    }, 250);
  };

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={isResetting}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-rule bg-surface px-4 text-sm font-semibold text-ink transition disabled:cursor-not-allowed disabled:opacity-50"
    >
      <RotateCcw className="size-4" />
      {isResetting ? "Resetting..." : "Reset all progress"}
    </button>
  );
}
