"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { CheckCircle2, ExternalLink, Send, MessageSquareText, ScrollText, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setLessonCompleted } from "@/lib/lesson-progress";
import { BADGES } from "@/lib/gamification";
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
  const [technicalWriteup, setTechnicalWriteup] = useState(
    initialSubmission?.technicalWriteup ?? initialSubmission?.notes ?? ""
  );
  const [reflection, setReflection] = useState(initialSubmission?.reflection ?? "");
  const [skillsText, setSkillsText] = useState(initialSubmission?.skills.join(", ") ?? "");
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
    const trimmedReflection = reflection.trim();

    if (!trimmedRepoUrl) {
      setErrorMessage("Please share a repository URL so we can review your work.");
      return;
    }

    if (!trimmedReflection) {
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

      const unlockedAchievementIds = result.unlockedAchievementIds ?? [];
      const unlockedTitles = unlockedAchievementIds
        .map((id) => BADGES.find((badge) => badge.id === id)?.title)
        .filter(Boolean) as string[];

      setSubmission(result.submission);
      setSuccessMessage(
        unlockedTitles.length > 0
          ? `Build mission saved. This quest is now marked complete. Badge unlocked: ${unlockedTitles.join(", ")}`
          : "Build mission saved. This quest is now marked complete."
      );
      setLessonCompleted({ moduleSlug, lessonSlug, completed: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <section className="mt-8 rounded-xl border border-rule bg-surface p-4">
        <h2 className="text-lg font-bold text-ink">Build mission submission</h2>
        <p className="mt-3 text-sm text-ink-soft">
          Set up Supabase to capture mission submissions and keep your portfolio progress.
        </p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="mt-8 rounded-xl border border-rule bg-surface p-4">
        <h2 className="text-lg font-bold text-ink">Build mission submission</h2>
        <p className="mt-3 text-sm text-ink-soft">
          Sign in to save and submit your mission for this quest.
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
        Build mission submission
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
          {submission.skills.length > 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              Skills: {submission.skills.join(", ")}
            </p>
          ) : null}
          {submission.technicalWriteup ? (
            <p className="mt-1 text-sm text-ink-soft">
              Write-up: {submission.technicalWriteup.slice(0, 160)}
              {submission.technicalWriteup.length > 160 ? "..." : ""}
            </p>
          ) : null}
          {submission.reflection ? (
            <p className="mt-1 text-sm text-ink-soft">
              Reflection: {submission.reflection.slice(0, 180)}
              {submission.reflection.length > 180 ? "..." : ""}
            </p>
          ) : null}
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
          Mission title
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
          Skills demonstrated (comma-separated)
          <Wrench className="size-4 text-accent" aria-hidden="true" />
          <input
            className="min-h-11 rounded-lg border border-rule bg-paper px-3 text-sm font-normal"
            name="skills"
            type="text"
            value={skillsText}
            onChange={(event) => setSkillsText(event.target.value)}
            placeholder="Python, GitHub Actions, React"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Technical write-up
          <ScrollText className="size-4 text-accent" aria-hidden="true" />
          <textarea
            className="min-h-24 rounded-lg border border-rule bg-paper px-3 py-3 text-sm font-normal"
            name="technicalWriteup"
            value={technicalWriteup}
            onChange={(event) => setTechnicalWriteup(event.target.value)}
            placeholder="What did you build and how does it work?"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Reflection
          <MessageSquareText className="size-4 text-accent" />
          <textarea
            className="min-h-28 rounded-lg border border-rule bg-paper px-3 py-3 text-sm font-normal"
            name="reflection"
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            required
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isLoading={isSubmitting}>
            <Send className="size-4" aria-hidden="true" />
            {hasSubmission ? "Update mission" : "Save mission"}
          </Button>
          {hasSubmission ? (
            <span className="text-sm text-ink-soft">You can update this submission anytime.</span>
          ) : null}
        </div>
        {successMessage ? <p className="text-sm text-success">{successMessage}</p> : null}
        {errorMessage ? <p className="text-sm text-accent">{errorMessage}</p> : null}
      </form>
    </section>
  );
}
