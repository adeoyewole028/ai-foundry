import type { AnchorHTMLAttributes } from "react";
import type { MDXComponents } from "mdx/types";
import { ExternalLink } from "lucide-react";
import { getLinkTarget } from "@/lib/mdx-link-rules.js";

function LessonAnchor({
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const hrefValue = typeof href === "string" ? href.trim() : "";
  const { target, rel, isExternal } = getLinkTarget(hrefValue);
  const isLinkExternal = isExternal;
  const finalTarget = isLinkExternal ? target : props.target;
  const finalRel = isLinkExternal ? rel : props.rel;

  return (
    <a
      {...props}
      href={href}
      target={finalTarget}
      rel={finalRel}
      className="inline-flex items-center gap-1.5 text-base font-semibold text-[var(--color-accent)] underline decoration-[var(--color-accent)] decoration-2 underline-offset-6 hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
      aria-label={
        isLinkExternal && typeof children === "string"
          ? `${children} (opens in a new tab)`
          : props["aria-label"]
      }
    >
      <span>{children}</span>
      {isLinkExternal ? <ExternalLink className="inline-block h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> : null}
    </a>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    a: LessonAnchor
  };
}
