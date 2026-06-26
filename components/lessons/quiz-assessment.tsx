"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CircleCheck,
  ClipboardCheck,
  Eye,
  PenLine,
  Lightbulb,
  X
} from "lucide-react";
import { submitQuizAttemptAction } from "@/app/progress/actions";
import type { QuizOption, QuizQuestion } from "@/lib/content";
import { BADGES } from "@/lib/gamification";
import { gradeQuizAnswer, resolveQuizCorrectOptionId } from "@/lib/quiz-grading";
import {
  isLessonCompleted,
  lessonActivityStorageKey,
  lessonProgressEventName,
  lessonProgressKey,
  readLessonProgress,
  setLessonCompleted
} from "@/lib/lesson-progress";

type QuizAssessmentProps = {
  moduleSlug: string;
  lessonSlug: string;
  questions: QuizQuestion[];
  quizMode?: "multiple-choice" | "short-answer";
  initialCompleted?: boolean;
  initialAnswers?: Record<string, string>;
  initialSubmitted?: boolean;
};

type QuizAnswerState = {
  answers: Record<string, string>;
  submitted: boolean;
};

type DisplayOption = QuizOption & {
  isGenerated?: boolean;
};

const MIN_SHORT_ANSWER_CHARS = 6;
const optionLetters = ["A", "B", "C", "D", "E", "F"];

const fallbackDistractors = [
  {
    id: "rule-based",
    label: "Use exact hand-written rules for every case",
    explanation:
      "Rules are useful when logic is stable, but this answer misses the learned-pattern behavior being checked here."
  },
  {
    id: "database-lookup",
    label: "Look up a stored answer from a database",
    explanation:
      "A database can retrieve known records, but it does not explain the model or AI concept in this question."
  },
  {
    id: "interface-change",
    label: "Change the interface layout or visual styling",
    explanation:
      "Interface changes can improve usability, but they are not the underlying AI concept being tested."
  }
];

function shuffleBySeed(items: DisplayOption[], seed: string) {
  if (items.length <= 1) {
    return items;
  }

  let state = Array.from(seed).reduce((accumulator, character) => {
    return ((accumulator * 1315423911) ^ character.charCodeAt(0)) >>> 0;
  }, 2166136261);

  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };

  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(next() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function getStableOptionIndex(questionId: string, optionCount: number) {
  if (optionCount <= 1) {
    return 0;
  }

  const total = Array.from(questionId).reduce((sum, character) => sum + character.charCodeAt(0), 0);

  return total % optionCount;
}

function readQuizActivity(
  key: string,
  initialAnswers: Record<string, string>,
  initialSubmitted: boolean
): QuizAnswerState {
  if (typeof window === "undefined") {
    return { answers: initialAnswers, submitted: initialSubmitted };
  }

  try {
    const raw = window.localStorage.getItem(lessonActivityStorageKey);

    if (!raw) {
      return { answers: initialAnswers, submitted: initialSubmitted };
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const value = parsed[key];

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { answers: initialAnswers, submitted: initialSubmitted };
    }

    const candidate = value as { quizAnswers?: unknown; quizSubmitted?: unknown };
    const quizAnswers = candidate.quizAnswers;

    if (!quizAnswers || typeof quizAnswers !== "object" || Array.isArray(quizAnswers)) {
      return {
        answers: initialAnswers,
        submitted: initialSubmitted || candidate.quizSubmitted === true
      };
    }

    return {
      submitted: initialSubmitted || candidate.quizSubmitted === true,
      answers: Object.entries(quizAnswers).reduce<Record<string, string>>(
        (acc, [answerKey, answer]) => {
          if (typeof answer === "string") {
            acc[answerKey] = answer;
          }

          return acc;
        },
        { ...initialAnswers }
      )
    };
  } catch {
    return { answers: initialAnswers, submitted: initialSubmitted };
  }
}

function writeQuizActivity(key: string, state: QuizAnswerState) {
  if (typeof window === "undefined") {
    return;
  }

  let parsed: Record<string, unknown> = {};

  try {
    const raw = window.localStorage.getItem(lessonActivityStorageKey);
    parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    parsed = {};
  }

  const current = parsed[key] && typeof parsed[key] === "object" && !Array.isArray(parsed[key])
    ? (parsed[key] as Record<string, unknown>)
    : {};

  window.localStorage.setItem(
    lessonActivityStorageKey,
    JSON.stringify({
      ...parsed,
      [key]: {
        ...current,
        quizAnswers: state.answers,
        quizSubmitted: state.submitted
      }
    })
  );
}

function getQuestionOptions(question: QuizQuestion, shuffleSeed: string): DisplayOption[] {
  if (question.options.length > 0) {
    return shuffleBySeed(question.options, `${question.id}::${question.prompt}::${shuffleSeed}`);
  }

  const options = [
    {
      id: "correct",
      label: question.correctAnswer,
      explanation: question.correctAnswer,
      isGenerated: true
    },
    ...fallbackDistractors
  ];
  const correctIndex = getStableOptionIndex(question.id, options.length);
  const [correctOption] = options.splice(0, 1);

  options.splice(correctIndex, 0, correctOption);

  return shuffleBySeed(options, `${question.id}::generated::${shuffleSeed}`);
}

function getCorrectOptionId(question: QuizQuestion) {
  const resolvedCorrectOptionId = resolveQuizCorrectOptionId(question);

  if (resolvedCorrectOptionId) {
    return resolvedCorrectOptionId;
  }

  return null;
}

function getSelectedOption(
  options: DisplayOption[],
  selectedOptionId: string | undefined
) {
  return options.find((option) => option.id === selectedOptionId) ?? null;
}

export function QuizAssessment({
  moduleSlug,
  lessonSlug,
  questions,
  quizMode = "multiple-choice",
  initialCompleted = false,
  initialAnswers = {},
  initialSubmitted = false
}: QuizAssessmentProps) {
  const lessonKey = lessonProgressKey({ moduleSlug, lessonSlug });
  const [shuffleSeed] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );
  const [state, setState] = useState<QuizAnswerState>({ answers: {}, submitted: false });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionSubmitted, setQuestionSubmitted] = useState<Record<string, boolean>>({});
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [achievementMessage, setAchievementMessage] = useState<string | null>(null);

  useEffect(() => {
    setState(readQuizActivity(lessonKey, initialAnswers, initialSubmitted));
    setQuestionSubmitted(
      initialSubmitted
        ? questions.reduce<Record<string, boolean>>((acc, question) => {
          acc[question.id] = true;

          return acc;
        }, {})
        : {}
    );
    const localCompletion = isLessonCompleted(readLessonProgress(), {
      moduleSlug,
      lessonSlug
    });
    setIsCompleted(initialCompleted || localCompletion);

    const refresh = () => {
      const localCompleted = isLessonCompleted(readLessonProgress(), {
        moduleSlug,
        lessonSlug
      });
      setIsCompleted(initialCompleted || localCompleted);
    };

    window.addEventListener("storage", refresh);
    window.addEventListener(lessonProgressEventName, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(lessonProgressEventName, refresh);
    };
  }, [lessonKey, lessonSlug, moduleSlug, initialCompleted, initialAnswers, initialSubmitted]);

  const displayQuestions = useMemo(
    () =>
      questions.map((question) => ({
        ...question,
        options: quizMode === "short-answer" ? [] : getQuestionOptions(question, shuffleSeed),
        correctOptionId: getCorrectOptionId(question)
      })),
    [questions, quizMode, shuffleSeed]
  );
  const currentQuestion = displayQuestions[currentIndex];
  const selectedOptionId = currentQuestion ? state.answers[currentQuestion.id] : undefined;
  const currentAnswer = currentQuestion ? (state.answers[currentQuestion.id] ?? "") : "";
  const hasShortAnswerMode = currentQuestion
    ? quizMode === "short-answer" || currentQuestion.options.length === 0
    : false;
  const currentResult = currentQuestion
    ? gradeQuizAnswer(currentQuestion, currentAnswer, quizMode)
    : null;
  const isCurrentQuestionSubmitted = currentQuestion
    ? questionSubmitted[currentQuestion.id] ?? false
    : false;
  const selectedOption = currentQuestion
    ? getSelectedOption(currentQuestion.options, selectedOptionId)
    : null;
  const correctOption = currentQuestion
    ? getSelectedOption(currentQuestion.options, currentQuestion.correctOptionId ?? undefined)
    : null;
  const answeredCount = displayQuestions.filter((question) => {
    const answer = state.answers[question.id] ?? "";

    return quizMode === "short-answer" || question.options.length === 0
      ? answer.trim().length >= MIN_SHORT_ANSWER_CHARS
      : !!answer;
  }).length;
  const passedCount = displayQuestions.filter((question) => {
    return gradeQuizAnswer(question, state.answers[question.id] ?? "", quizMode).passed;
  }).length;
  const isPassing = displayQuestions.length > 0 && passedCount === displayQuestions.length;
  const hasAnsweredCurrent = hasShortAnswerMode
    ? currentAnswer.trim().length >= MIN_SHORT_ANSWER_CHARS
    : !!selectedOptionId;
  const isLastQuestion = currentIndex === displayQuestions.length - 1;
  const progressWidth = displayQuestions.length > 0
    ? `${Math.round((answeredCount / displayQuestions.length) * 100)}%`
    : "0%";

  const setAnswer = (questionId: string, value: string) => {
    const next = {
      answers: {
        ...state.answers,
        [questionId]: value
      },
      submitted: false
    };

    setState(next);
    setQuestionSubmitted((previous) => ({
      ...previous,
      [questionId]: false
    }));
    writeQuizActivity(lessonKey, next);
    setServerMessage(null);
  };

  const submitQuiz = async (answers = state.answers) => {
    const next = { answers, submitted: true };
    setState(next);
    writeQuizActivity(lessonKey, next);
    setIsSubmitting(true);
    setServerMessage(null);

    let result: { ok: false; error: string } | ({ ok: true } & { [key: string]: unknown }) | null = null;

    setQuestionSubmitted((previous) =>
      questions.reduce<Record<string, boolean>>((acc, question) => {
        acc[question.id] = previous[question.id] ?? true;

        return acc;
      }, { ...previous })
    );

    try {
      result = await submitQuizAttemptAction({
        moduleSlug,
        lessonSlug,
        questions: displayQuestions,
        answers: next.answers,
        quizMode
      });
    } finally {
      setIsSubmitting(false);
    }

    const hasPassed = typeof result === "object" && result !== null && "ok" in result && result.ok && "passed" in result
      ? typeof result.passed === "boolean"
        ? result.passed
        : isPassing
      : isPassing;

    if (result && "ok" in result && !result.ok) {
      if (result.error === "not_authenticated") {
        setServerMessage(
          "You're not signed in, so this trial is tracked locally. Sign in to save it to your account."
        );
      } else if (result.error === "supabase_not_configured") {
        setServerMessage("Progress sync is currently unavailable. Trial progress is saved locally.");
      } else {
        setServerMessage(`Could not save trial result yet: ${result.error}`);
      }
      setAchievementMessage(null);
    } else {
      const unlockedAchievementIds = result && "ok" in result && result.ok
        ? (result as { unlockedAchievementIds?: unknown }).unlockedAchievementIds
        : null;
      const unlockedTitleList = Array.isArray(unlockedAchievementIds)
        ? unlockedAchievementIds
          .map((id) => (typeof id === "string" ? id : null))
          .filter((id): id is string => id !== null)
          .map((id) => BADGES.find((badge) => badge.id === id)?.title)
          .filter(Boolean) as string[]
        : [];

      setAchievementMessage(
        unlockedTitleList.length > 0 ? `Badge unlocked: ${unlockedTitleList.join(", ")}` : null
      );
      setServerMessage(null);
    }

    if (hasPassed) {
      setLessonCompleted({
        moduleSlug,
        lessonSlug,
        completed: true
      });
    }

    setIsCompleted(hasPassed || initialCompleted);
  };

  const goNext = () => {
    if (!hasAnsweredCurrent) {
      return;
    }

    setQuestionSubmitted((previous) => ({
      ...previous,
      [currentQuestion.id]: true
    }));

    if (isLastQuestion) {
      void submitQuiz();
      return;
    }

    setCurrentIndex((index) => Math.min(index + 1, displayQuestions.length - 1));
  };

  if (!currentQuestion) {
    return (
      <section className="mt-8 rounded-xl border border-rule bg-paper p-5">
        <p className="text-sm text-ink-soft">
          No knowledge trial questions are available for this quest yet.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-rule bg-paper">
      <div className="border-b border-rule bg-surface px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ClipboardCheck className="size-4 text-accent" aria-hidden="true" />
              Knowledge Trial
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
              {quizMode === "short-answer"
                ? "Answer in your own words, then review your rubric feedback before moving on."
                : "Choose the best answer, review the explanation, then move to the next question."}
            </p>
          </div>
          <span className="rounded-full border border-rule bg-paper px-3 py-1 text-sm font-semibold text-ink-soft">
            {passedCount} / {displayQuestions.length} correct
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-rule" aria-hidden="true">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: progressWidth }} />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-ink-soft">
            {currentIndex + 1} / {displayQuestions.length}
          </p>
          {isCurrentQuestionSubmitted ? (
            <details className="group relative">
              <summary className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-rule bg-surface px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent/50">
                <Eye className="size-3.5" aria-hidden="true" />
                View answer source
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-rule bg-surface p-4 text-sm leading-6 text-ink-soft shadow-[var(--shadow-soft)]">
                {currentQuestion.correctAnswer}
              </div>
            </details>
          ) : (
            <span className="text-xs text-ink-soft">Answer this question to unlock reference.</span>
          )}
        </div>

        <h3 className="mt-8 text-2xl font-bold leading-10 text-ink">
          {currentQuestion.prompt}
        </h3>

        {hasShortAnswerMode ? (
          <div className="mt-8 grid gap-3">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-ink">Write your answer</span>
              <textarea
                aria-label={`Answer for ${currentQuestion.prompt}`}
                className="min-h-40 rounded-lg border border-rule bg-surface p-4 text-sm text-ink outline-none transition focus-visible:ring-2 focus-visible:ring-accent"
                placeholder="Type your response..."
                value={currentAnswer}
                onChange={(event) => setAnswer(currentQuestion.id, event.target.value)}
              />
            </label>
            <p className="text-xs text-ink-soft">
              {currentAnswer.trim().length} characters • minimum {MIN_SHORT_ANSWER_CHARS} to continue
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOptionId === option.id;
              const isCorrect = option.id === currentQuestion.correctOptionId;
              const showFeedback = isCurrentQuestionSubmitted;
              const isIncorrectSelection = showFeedback && isSelected && !isCorrect;
              const optionStateClass =
                showFeedback && isCorrect
                  ? "border-accent/40 bg-accent-soft text-ink"
                  : isIncorrectSelection
                    ? "border-danger/40 bg-danger/15 text-ink"
                    : isSelected
                      ? "border-accent/40 bg-surface text-ink"
                      : "border-transparent bg-surface text-ink-soft hover:border-accent/40 hover:text-ink";

              return (
                <button
                  className={`w-full rounded-lg border px-4 py-4 text-left transition ${optionStateClass}`}
                  disabled={isSubmitting}
                  key={option.id}
                  onClick={() => setAnswer(currentQuestion.id, option.id)}
                  type="button"
                >
                  <span className="flex items-start gap-4">
                    <span className="mt-0.5 font-mono text-sm font-semibold text-ink">
                      {optionLetters[index] ?? index + 1}.
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold leading-7">
                        {option.label}
                      </span>
                      {showFeedback && (isSelected || isCorrect) ? (
                        <span className="mt-3 flex gap-2 text-sm leading-6">
                          {isCorrect ? (
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                          ) : (
                            <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                          )}
                          <span>
                            <strong className="text-ink">
                              {isCorrect ? "That's right." : "Not quite."}
                            </strong>{" "}
                            {option.explanation || (isCorrect ? currentQuestion.correctAnswer : "Review the correct answer before moving on.")}
                          </span>
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

          {isCurrentQuestionSubmitted && currentResult ? (
            <div
              className={`mt-5 rounded-lg border p-4 text-sm leading-6 ${
                currentResult.passed
                  ? "border-accent/40 bg-accent-soft text-ink"
                  : "border-rule bg-surface text-ink-soft"
              }`}
            >
            <p className="flex items-center gap-2 font-semibold text-ink">
              {currentResult.passed ? (
                <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
              ) : (
                <CircleAlert className="size-4 text-accent" aria-hidden="true" />
              )}
              {currentResult.passed ? "That's right." : "Review this one."}
            </p>
            <p className="mt-2">
              {hasShortAnswerMode
                ? "Use your own words, and make sure you address the rubric points shown above."
                : currentResult.correctOptionId === null
                  ? "This question needs review in content because no explicit correct option is configured."
                : currentResult.passed
                  ? correctOption?.explanation || currentQuestion.correctAnswer
                  : selectedOption?.explanation || "Compare your choice with the highlighted correct answer."}
            </p>
            {hasShortAnswerMode && currentResult.criterionResults.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                {currentResult.criterionResults.map((criterion) => (
                  <li key={criterion.criterionId}>
                    <span className={criterion.passed ? "text-accent" : "text-ink-soft"}>
                      {criterion.passed ? "✓" : "•"}
                    </span>
                    <span className="ml-2 font-semibold">{criterion.label}</span>
                    <span> — {criterion.passed ? "met" : "not met"}</span>
                    <span className="text-xs text-ink-soft">
                      {criterion.matchedTerms.length > 0 ? (
                        <span className="ml-4 block">Found: {criterion.matchedTerms.join(", ")}</span>
                      ) : null}
                      <span className="ml-4 block">Target ideas: {criterion.requiredTerms.join(", ")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-rule bg-surface p-4 text-sm text-ink-soft">
            <Lightbulb className="size-4 text-accent" aria-hidden="true" />
            {hasShortAnswerMode ? (
              <>
                <PenLine className="size-4 text-accent" aria-hidden="true" />
                <span>Answer in your own words, then move on for feedback.</span>
              </>
        ) : (
              "Pick an answer to reveal feedback."
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rule bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentIndex === 0 || isSubmitting}
            onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
            type="button"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </button>
          <div className="text-sm text-ink-soft" aria-live="polite">
            {isCompleted
              ? "Knowledge Trial passed. The next unit is unlocked."
              : state.submitted && !isPassing
                ? "Review missed answers, then finish again."
                : `${answeredCount} of ${displayQuestions.length} answered`}
            {serverMessage ? <span className="ml-2 text-accent">{serverMessage}</span> : null}
            {achievementMessage ? <span className="ml-2 text-accent">• {achievementMessage}</span> : null}
          </div>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-surface transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasAnsweredCurrent || isSubmitting}
            onClick={goNext}
            type="button"
          >
            {isSubmitting ? "Saving..." : isLastQuestion ? "Finish trial" : "Next"}
            {isLastQuestion ? (
              <CircleCheck className="size-4" aria-hidden="true" />
            ) : (
              <ArrowRight className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
