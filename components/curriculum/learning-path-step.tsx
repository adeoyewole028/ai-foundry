import { ArrowRight } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { ProgressInterruptionModal } from "@/components/curriculum/progress-interruption-modal";

type LearningPathStepProps = {
  stageLabel: string;
  index: number;
  title: string;
  status: string;
  summary: string;
  progress: number;
  href: string;
  isEnabled: boolean;
  lockedTitle?: string;
  continueHref?: string;
};

export function LearningPathStep({
  stageLabel,
  index,
  title,
  status,
  summary,
  progress,
  href,
  isEnabled,
  lockedTitle,
  continueHref
}: LearningPathStepProps) {
  const [pendingRedirect, setPendingRedirect] = useState<{ href: string } | null>(null);

  const continueTarget = isEnabled
    ? href
    : continueHref ?? "/curriculum";
  const requiredTitle = lockedTitle ?? "your current stage";
  const lockedCopy = `Complete "${requiredTitle}" first to unlock this stage.`;
  const progressHint = "Stay in order: each stage unlocks only after the prior stage is complete.";

  return (
    <article className="rounded-lg border border-rule bg-surface p-4">
      <p className="font-mono text-xs font-semibold uppercase text-accent">
        {stageLabel} {String(index).padStart(2, "0")}
      </p>
      <h3 className="mt-2 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1 text-xs font-semibold text-ink-soft">{status}</p>
      <p className="mt-3 text-sm text-ink-soft">{summary}</p>
      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <span>{progress}% complete</span>
      </div>
      {isEnabled ? (
        <Link
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:text-ink"
          href={href}
        >
          Continue stage
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <>
          <button
            aria-label={`Open continuation guidance for ${title}`}
            className="mt-4 inline-flex cursor-not-allowed items-center gap-2 text-sm font-semibold text-ink-soft"
            onClick={() => setPendingRedirect({ href: continueTarget })}
            type="button"
          >
            Stage locked
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          {pendingRedirect ? (
            <ProgressInterruptionModal
              continueHref={pendingRedirect.href}
              continueLabel="Continue in order"
              description={`"${title}" is still locked until you complete ${requiredTitle}.`}
              progressHint={progressHint}
              onClose={() => setPendingRedirect(null)}
              open={Boolean(pendingRedirect)}
              supportingText={lockedCopy}
              title="Stage locked"
            />
          ) : null}
        </>
      )}
    </article>
  );
}
