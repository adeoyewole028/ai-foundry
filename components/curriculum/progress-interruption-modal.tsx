"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

type ProgressInterruptionModalProps = {
  open: boolean;
  title: string;
  description: string;
  progressHint?: string;
  supportingText?: string;
  continueHref: string;
  continueLabel: string;
  onClose: () => void;
};

export function ProgressInterruptionModal({
  open,
  title,
  description,
  progressHint,
  supportingText,
  continueHref,
  continueLabel,
  onClose
}: ProgressInterruptionModalProps) {
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const nodeList = dialogRef.current?.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex='-1'])"
    );

    const firstFocusable = nodeList?.[0] ?? null;
    const lastFocusable = nodeList && nodeList.length > 0 ? nodeList[nodeList.length - 1] : null;

    closeBtnRef.current?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current || !nodeList || nodeList.length === 0) {
        return;
      }

      const isShift = event.shiftKey;
      const active = document.activeElement;

      if (isShift && active === firstFocusable) {
        event.preventDefault();
        (lastFocusable as HTMLElement | null)?.focus();
        return;
      }

      if (!isShift && active === lastFocusable) {
        event.preventDefault();
        (firstFocusable as HTMLElement | null)?.focus();
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      if (previousActiveElement?.focus) {
        previousActiveElement.focus();
      }
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-ink/30 px-4 backdrop-blur-sm"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-rule bg-surface p-5 shadow-[var(--shadow-soft)]"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <ArrowRight className="size-4" aria-hidden="true" />
            Continue your quest
          </div>
          <button
            aria-label="Close confirmation"
            className="inline-flex size-9 items-center justify-center rounded-full border border-rule bg-paper text-ink-soft transition hover:border-accent/50 hover:text-ink"
            onClick={onClose}
            ref={closeBtnRef}
            type="button"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      <h2 id={titleId} className="mt-3 text-2xl font-black tracking-[-0.03em] text-ink">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-ink-soft">{description}</p>
      {progressHint ? (
        <p className="mt-3 rounded-md border border-rule/40 bg-paper px-2 py-2 text-sm leading-6 text-ink-soft">
          {progressHint}
        </p>
      ) : null}
      {supportingText ? <p className="mt-3 text-sm leading-6 text-ink-soft">{supportingText}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="inline-flex min-h-11 items-center rounded-full border border-rule bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent/50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <Link
            className="inline-flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition"
            href={continueHref}
            style={{
              backgroundColor: "var(--color-ink)",
              color: "var(--color-surface)"
            }}
            onClick={onClose}
          >
            {continueLabel}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
