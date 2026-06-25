"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { CheckCircle2, ExternalLink, MessageSquareText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setLessonCompleted } from "@/lib/lesson-progress";
import type { ProjectSubmission } from "@/lib/supabase/project-submissions";
import { submitProjectSubmissionAction } from "@/app/progress/actions";

type ProjectSubmissionFormProps = {
  moduleSlug: string;
  lessonSlug: string;
  lessonTitle: string;
  initialSubmission: ProjectSubmission | null;
  isAuthenticated: boolean;
  isSupabaseConfigured: boolean;
};

export function ProjectSubmissionForm({
  moduleSlug,
  lessonSlug,
  lessonTitle,
  initialSubmission,
  isAuthenticated,
  isSupabaseConfigured
}: ProjectSubmissionFormProps) {
  const [repoUrl, setRepoUrl] = useState(initialSubmission?.repoUrl ?? "");
  const [liveUrl, setLiveUrl] = useState(initialSubmission?.liveUrl ?? "");
  const [notes, setNotes] = useState(initialSubmission?.notes ?? "");
  const [submission, setSubmission] = useState<ProjectSubmission | null>(initialSubmission);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const hasSubmission = !!submission;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedRepoUrl = repoUrl.trim();
    const trimmedNotes = notes.trim();

    if (!trimmedRepoUrl) {
      setErrorMessage("Please share a repository URL so we can review your work.");
      return;
    }

    if (!trimmedNotes) {
      setErrorMessage("Add a short reflection before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await submitProjectSubmissionAction(formData);

      if (!result.ok) {
        setErrorMessage(result.error ?? "Unable to save your submission.");
        return;
      }

      setSubmission(result.submission);
      setSuccessMessage("Project saved. Your lesson is now marked complete.");
      setLessonCompleted({ moduleSlug, lessonSlug, completed: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <section className="mt-8 rounded-xl border border-rule bg-surface p-4">
        <h2 className="text-lg font-bold text-ink">Project submission</h2>
        <p className="mt-3 text-sm text-ink-soft">
          Set up Supabase to capture project submissions and keep your portfolio progress.
        </p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="mt-8 rounded-xl border border-rule bg-surface p-4">
        <h2 className="text-lg font-bold text-ink">Project submission</h2>
        <p className="mt-3 text-sm text-ink-soft">
          Sign in to save and submit your project for this lesson.
        </p>
        <div className="mt-4">
          <Link
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-surface transition hover:bg-ink/90"
            href="/auth/login"
          >
            Log in to submit
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-rule bg-surface p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
        Project submission
      </div>
      {hasSubmission ? (
        <div className="mb-5 rounded-lg border border-rule bg-paper p-3">
          <p className="text-sm font-semibold text-ink">Latest submission saved</p>
          <p className="mt-2 text-sm text-ink-soft">
            Status: <span className="font-semibold text-ink">{submission.status}</span>
          </p>
          <a
            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-accent underline underline-offset-4"
            href={submission.repoUrl}
            rel="noreferrer noopener"
            target="_blank"
          >
            Open repository
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
          {submission.liveUrl ? (
            <a
              className="mt-2 ml-4 inline-flex items-center gap-2 text-sm font-semibold text-accent underline underline-offset-4"
              href={submission.liveUrl}
              rel="noreferrer noopener"
              target="_blank"
            >
              Open live demo
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="grid gap-4">
        <input name="moduleSlug" type="hidden" value={moduleSlug} />
        <input name="lessonSlug" type="hidden" value={lessonSlug} />
        <label className="grid gap-1 text-sm font-semibold text-ink">
          Project title
          <input
            className="min-h-11 rounded-lg border border-rule bg-paper px-3 text-sm font-normal"
            name="title"
            required
            type="text"
            value={lessonTitle}
            readOnly
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-ink">
          Repository URL
          <input
            className="min-h-11 rounded-lg border border-rule bg-paper px-3 text-sm font-normal"
            name="repoUrl"
            required
            type="url"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-ink">
          Live URL (optional)
          <input
            className="min-h-11 rounded-lg border border-rule bg-paper px-3 text-sm font-normal"
            name="liveUrl"
            type="url"
            value={liveUrl}
            onChange={(event) => setLiveUrl(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Notes / reflection
          <MessageSquareText className="size-4 text-accent" />
          <textarea
            className="min-h-28 rounded-lg border border-rule bg-paper px-3 py-3 text-sm font-normal"
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            required
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isLoading={isSubmitting}>
            <Send className="size-4" aria-hidden="true" />
            {hasSubmission ? "Update submission" : "Save project"}
          </Button>
          {hasSubmission ? (
            <span className="text-sm text-ink-soft">You can update this submission anytime.</span>
          ) : null}
        </div>
        {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
        {errorMessage ? <p className="text-sm text-accent">{errorMessage}</p> : null}
      </form>
    </section>
  );
}
