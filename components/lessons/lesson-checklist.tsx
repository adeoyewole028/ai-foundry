"use client";

import { useEffect, useState } from "react";
import { CircleCheck, ClipboardCheck, MessageSquareText, Lock } from "lucide-react";
import type { LessonMeta } from "@/lib/content";
import { syncLessonCompletion } from "@/app/progress/actions";
import {
  isLessonCompleted,
  lessonProgressEventName,
  lessonProgressKey,
  lessonActivityStorageKey,
  readLessonProgress,
  setLessonCompleted
} from "@/lib/lesson-progress";

type LessonChecklistProps = {
  moduleSlug: string;
  lessonSlug: string;
  lesson: Pick<LessonMeta, "checklist" | "questions">;
  initialCompleted?: boolean;
};

type LessonActivityState = {
  checks: Record<string, boolean>;
  answers: Record<string, string>;
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
          };

          const checks = candidate.checks;
          const answers = candidate.answers;

          if (
            typeof checks === "object" &&
            checks !== null &&
            typeof answers === "object" &&
            answers !== null
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
    answers: {}
  });
  const [isCompleted, setIsCompleted] = useState(initialCompleted);

  useEffect(() => {
    const stored = readLessonActivity();
    setActivity(stored[lessonKey] ?? { checks: {}, answers: {} });
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
  const questionItems = lesson.questions.length > 0 ? lesson.questions : ["What did you learn?"];

  const allChecked = checklistItems.every((item) => activity.checks[item] === true);
  const allAnswered = questionItems.every((item) => {
    const answer = activity.answers[item] ?? "";
    return answer.trim().length >= 20;
  });
  const canComplete = allChecked && allAnswered;
  const missingChecklistItems = checklistItems.filter((item) => activity.checks[item] !== true);
  const missingQuestionItems = questionItems.filter((item) => (activity.answers[item] ?? "").trim().length < 20);
  const missingChecklist = missingChecklistItems.length;
  const missingQuestions = missingQuestionItems.length;

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

  const setAnswer = (item: string, value: string) => {
    const next = {
      ...activity,
      answers: { ...activity.answers, [item]: value }
    };
    setActivity(next);
    writeLessonActivity({
      ...readLessonActivity(),
      [lessonKey]: next
    });
  };

  const markAsComplete = () => {
    if (!canComplete) {
      return;
    }

    setLessonCompleted({
      moduleSlug,
      lessonSlug,
      completed: true
    });

    void syncLessonCompletion({
      moduleSlug,
      lessonSlug,
      completed: true
    });
  };

  return (
    <section className="mt-8 rounded-xl border border-rule bg-surface p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        <ClipboardCheck className="size-4 text-accent" />
        Lesson Completion Check
      </div>
      <ul className="space-y-2 text-sm">
        {checklistItems.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={activity.checks[item] === true}
              onChange={() => toggleCheck(item)}
              className="mt-1 size-4"
              aria-label={`Confirm: ${item}`}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 space-y-3">
        {questionItems.map((question) => (
          <label key={question} className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">{question}</span>
            <MessageSquareText className="mb-1 size-4 text-accent" />
            <textarea
              className="w-full rounded-lg border border-rule bg-paper/10 p-3 text-sm"
              rows={3}
              value={activity.answers[question] ?? ""}
              onChange={(event) => setAnswer(question, event.target.value)}
              placeholder="Type your response..."
            />
          </label>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
        <p
          aria-live="polite"
          className={`text-sm ${canComplete ? "text-ink" : "text-ink-soft"}`}
        >
          {isCompleted
            ? "Lesson marked complete. Move to the next step when you're ready."
            : canComplete
              ? "Great. You can mark this lesson complete."
              : "Complete every checklist item and answer all questions to unlock completion."}
        </p>
        <button
          type="button"
          onClick={markAsComplete}
          disabled={!canComplete || isCompleted}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rule bg-surface px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CircleCheck className="size-4" />
          {isCompleted ? "Completed" : "Mark complete"}
        </button>
      </div>
      {!canComplete ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
          <Lock className="size-3" />
          {missingChecklist > 0
            ? `${missingChecklist} of ${checklistItems.length} checklist item${missingChecklist > 1 ? "s" : ""} remain.`
            : `${missingQuestions} of ${questionItems.length} question${missingQuestions > 1 ? "s" : ""} remain to answer.`}
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
          {missingQuestionItems.map((question) => (
            <li key={`missing-question-${question}`} className="flex items-start gap-2">
              <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-accent" />
              <span>Answer: {question}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
