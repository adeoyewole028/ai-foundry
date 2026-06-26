"use client";

import { useEffect, useState } from "react";
import { CircleCheck, ClipboardCheck, Lock } from "lucide-react";
import type { LessonMeta } from "@/lib/content";
import { syncLessonCompletion } from "@/app/progress/actions";
import { BADGES } from "@/lib/gamification";
import {
  isLessonCompleted,
  lessonProgressEventName,
  lessonProgressKey,
  lessonActivityStorageKey,
  readLessonProgress,
  setLessonCompleted
} from "@/lib/lesson-progress";

const MIN_CHECKLIST_EVIDENCE_CHARS = 12;

type LessonChecklistProps = {
  moduleSlug: string;
  lessonSlug: string;
  lesson: Pick<LessonMeta, "checklist" | "questions">;
  initialCompleted?: boolean;
};

type LessonActivityState = {
  checks: Record<string, boolean>;
  answers: Record<string, string>;
  checkAnswers: Record<string, string>;
};

function readLessonActivity(): Record<string, LessonActivityState> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(lessonActivityStorageKey);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, LessonActivityState>>(
      (acc, [key, value]) => {
        if (
          typeof key === "string" &&
          value &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          const candidate = value as {
            checks?: Record<string, unknown>;
            answers?: Record<string, unknown>;
            checkAnswers?: Record<string, unknown>;
          };

          const checks = candidate.checks;
          const answers = candidate.answers;
          const checkAnswers = candidate.checkAnswers;

          if (
            typeof checks === "object" &&
            checks !== null &&
            typeof answers === "object" &&
            answers !== null &&
            (typeof checkAnswers === "undefined" ||
              (typeof checkAnswers === "object" && checkAnswers !== null))
          ) {
            acc[key] = {
              checks: Object.entries(checks).reduce<Record<string, boolean>>((carry, [checkKey, checkValue]) => {
                if (typeof checkKey === "string") {
                  carry[checkKey] = checkValue === true;
                }

                return carry;
              }, {}),
              answers: Object.entries(answers).reduce<Record<string, string>>((carry, [answerKey, answerValue]) => {
                if (typeof answerKey === "string" && typeof answerValue === "string") {
                  carry[answerKey] = answerValue;
                }

                return carry;
              }, {}),
              checkAnswers: Object.entries(
                (checkAnswers ?? {}) as Record<string, unknown>
              ).reduce<Record<string, string>>((carry, [answerKey, answerValue]) => {
                if (typeof answerKey === "string" && typeof answerValue === "string") {
                  carry[answerKey] = answerValue;
                }

                return carry;
              }, {})
            };
          }
        }

        return acc;
      },
      {}
    );
  } catch {
    return {};
  }
}

function writeLessonActivity(next: Record<string, LessonActivityState>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(lessonActivityStorageKey, JSON.stringify(next));
}

export function LessonChecklist({
  moduleSlug,
  lessonSlug,
  lesson,
  initialCompleted = false
}: LessonChecklistProps) {
  const lessonKey = lessonProgressKey({ moduleSlug, lessonSlug });
  const [activity, setActivity] = useState<LessonActivityState>({
    checks: {},
    answers: {},
    checkAnswers: {}
  });
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [recentAchievementIds, setRecentAchievementIds] = useState<string[]>([]);

  const unlockedAchievementTitles = recentAchievementIds
    .map((id) => BADGES.find((badge) => badge.id === id)?.title)
    .filter(Boolean) as string[];

  useEffect(() => {
    const stored = readLessonActivity();
    setActivity(stored[lessonKey] ?? { checks: {}, answers: {}, checkAnswers: {} });
    const localCompletion = isLessonCompleted(readLessonProgress(), {
      moduleSlug,
      lessonSlug
    });
    setIsCompleted(initialCompleted || localCompletion);

    const refresh = () => {
      const localCompletion = isLessonCompleted(readLessonProgress(), {
        moduleSlug,
        lessonSlug
      });
      setIsCompleted(initialCompleted || localCompletion);
    };

    window.addEventListener("storage", refresh);
    window.addEventListener(lessonProgressEventName, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(lessonProgressEventName, refresh);
    };
  }, [lessonKey, lessonSlug, moduleSlug, initialCompleted]);

  const checklistItems = lesson.checklist.length > 0 ? lesson.checklist : ["I reviewed this lesson."];

  const hasChecklistEvidence = (item: string) => {
    return (activity.checkAnswers[item] ?? "").trim().length >= MIN_CHECKLIST_EVIDENCE_CHARS;
  };
  const allChecked = checklistItems.every(
    (item) => activity.checks[item] === true && hasChecklistEvidence(item)
  );
  const canComplete = allChecked;
  const missingChecklistItems = checklistItems.filter((item) => activity.checks[item] !== true);
  const missingChecklistAnswers = checklistItems.filter((item) => !hasChecklistEvidence(item));
  const missingChecklist = missingChecklistItems.length;

  const toggleCheck = (item: string) => {
    const next = {
      ...activity,
      checks: { ...activity.checks, [item]: !activity.checks[item] }
    };
    setActivity(next);
    writeLessonActivity({
      ...readLessonActivity(),
      [lessonKey]: next
    });
  };

  const setChecklistAnswer = (item: string, value: string) => {
    const next = {
      ...activity,
      checkAnswers: { ...activity.checkAnswers, [item]: value }
    };
    setActivity(next);
    writeLessonActivity({
      ...readLessonActivity(),
      [lessonKey]: next
    });
  };

  const markAsComplete = async () => {
    if (!canComplete) {
      return;
    }

    setLessonCompleted({
      moduleSlug,
      lessonSlug,
      completed: true
    });

    const result = await syncLessonCompletion({
      moduleSlug,
      lessonSlug,
      completed: true
    });

    if (result.ok) {
      setRecentAchievementIds(result.unlockedAchievementIds ?? []);
    } else if (!result.ok) {
      setRecentAchievementIds([]);
    }
  };

  return (
    <section className="mt-8 rounded-xl border border-rule bg-surface p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        <ClipboardCheck className="size-4 text-accent" />
        Quest Completion Check
      </div>
      <ul className="space-y-2 text-sm">
        {checklistItems.map((item) => (
          <li key={item} className="space-y-2 rounded-lg border border-rule bg-paper/10 p-3">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={activity.checks[item] === true}
                onChange={() => toggleCheck(item)}
                className="mt-1 size-4"
                aria-label={`Confirm: ${item}`}
              />
              <span>{item}</span>
            </label>
            <label className="block text-xs text-ink-soft">
              <span className="sr-only">Evidence for: {item}</span>
              <textarea
                className="mt-2 w-full rounded-lg border border-rule bg-paper/10 p-3 text-sm"
                rows={2}
                value={activity.checkAnswers[item] ?? ""}
                onChange={(event) => setChecklistAnswer(item, event.target.value)}
                placeholder="Type one sentence that shows you can do this."
              />
            </label>
            {activity.checks[item] && !hasChecklistEvidence(item) ? (
              <p className="mt-1 text-xs text-ink-soft">
                Add at least {MIN_CHECKLIST_EVIDENCE_CHARS} characters of evidence.
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
        <p
          aria-live="polite"
          className={`text-sm ${canComplete ? "text-ink" : "text-ink-soft"}`}
        >
          {isCompleted
            ? "Quest marked complete. Move to the next mission when you're ready."
            : canComplete
              ? "Great. You can mark this quest complete."
              : "Complete every checklist item to unlock completion."}
        </p>
        <button
          type="button"
          onClick={markAsComplete}
          disabled={!canComplete || isCompleted}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rule bg-surface px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CircleCheck className="size-4" />
          {isCompleted ? "Completed" : "Mark quest complete"}
        </button>
      </div>
      {!canComplete ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
          <Lock className="size-3" />
          {missingChecklist > 0
            ? `${missingChecklist} of ${checklistItems.length} checklist item${missingChecklist > 1 ? "s" : ""} remain.`
            : "No checklist items remain."}
        </p>
      ) : null}
      {!canComplete ? (
        <ul className="mt-3 space-y-2 text-sm text-ink-soft" role="list" aria-live="polite">
          {missingChecklistItems.map((item) => (
            <li key={`missing-check-${item}`} className="flex items-start gap-2">
              <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-accent" />
              <span>Complete: {item}</span>
            </li>
          ))}
          {missingChecklistAnswers.filter((item) => !missingChecklistItems.includes(item)).map((item) => (
            <li key={`missing-check-evidence-${item}`} className="flex items-start gap-2">
              <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-accent" />
              <span>Add evidence for: {item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {unlockedAchievementTitles.length > 0 ? (
        <p className="mt-3 text-sm text-accent">
          Badge unlocked: {unlockedAchievementTitles.join(", ")}
        </p>
      ) : null}
    </section>
  );
}
