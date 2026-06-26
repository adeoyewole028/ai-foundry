import { ButtonLink } from "@/components/ui/button";
import type { CuratedResource, CuratedResourceType } from "@/lib/content";
import { getLinkTarget } from "@/lib/mdx-link-rules";

type ResourceBadgeProps = {
  text: string;
  tone: "default" | "accent" | "ghost";
};

function badgeClassName(tone: ResourceBadgeProps["tone"]): string {
  if (tone === "accent") {
    return "bg-accent text-surface";
  }
  if (tone === "ghost") {
    return "bg-muted text-ink-soft";
  }
  return "bg-rule text-ink";
}

function formatCheckedAt(checkedAt: string): string {
  const parsed = new Date(checkedAt);

  if (Number.isNaN(parsed.getTime())) {
    return checkedAt;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(parsed);
}

export function ResourceBadge({ text, tone }: ResourceBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassName(tone)}`}>
      {text}
    </span>
  );
}

function safeExternalLink(url: string) {
  return getLinkTarget(url);
}

type CuratedResourceCardProps = {
  resource: CuratedResource;
};

function titleCaseResourceType(type: CuratedResourceType): string {
  if (type === "project-library") {
    return "Project Library";
  }
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

export function CuratedResourceCard({ resource }: CuratedResourceCardProps) {
  const linkMeta = safeExternalLink(resource.url);
  const checkedAtText = resource.checkedAt ? formatCheckedAt(resource.checkedAt) : null;
  const whenToUse = resource.whenToUse?.trim().length
    ? resource.whenToUse
    : "Follow the placement guidance for this stage.";

  return (
    <article className="rounded-lg border border-rule bg-surface p-4">
      <div className="flex flex-wrap gap-2">
        <ResourceBadge tone="accent" text={resource.required ? "Required" : "Optional"} />
        <ResourceBadge tone="default" text={titleCaseResourceType(resource.type)} />
        <ResourceBadge tone="ghost" text={resource.level} />
      </div>
      <h3 className="mt-3 text-sm font-bold text-ink">{resource.title}</h3>
      <p className="mt-1 text-xs font-semibold text-accent">{resource.provider}</p>
      <p className="mt-3 text-sm text-ink-soft">
        <span className="font-semibold text-ink-soft">Why this matters:</span> {resource.why}
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        <span className="font-semibold text-ink-soft">Use this:</span> {resource.placement}
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        <span className="font-semibold text-ink-soft">When to use:</span> {whenToUse}
      </p>
      {checkedAtText ? (
        <p className="mt-3 text-xs text-ink-soft">
          <span className="font-semibold text-ink-soft">Last checked:</span> {checkedAtText}
        </p>
      ) : null}
      {resource.notes ? (
        <p className="mt-3 text-xs text-ink-soft">{resource.notes}</p>
      ) : null}
      <div className="mt-4">
        <ButtonLink
          className="rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-accent/90 hover:text-paper"
          variant="secondary"
          href={resource.url}
          target={linkMeta.target}
          rel={linkMeta.rel}
          style={{
            background: "var(--color-accent)",
            color: "var(--color-surface)"
          }}
        >
          Open resource
        </ButtonLink>
      </div>
    </article>
  );
}

type CuratedResourceListProps = {
  resources: CuratedResource[];
  title: string;
};

export function CuratedResourceList({ resources, title }: CuratedResourceListProps) {
  if (resources.length === 0) {
    return null;
  }

  const resourceByUrl = new Map<string, CuratedResource>();

  for (const resource of resources) {
    const normalizedUrl = resource.url.trim().toLowerCase();
    const existing = resourceByUrl.get(normalizedUrl);

    if (!existing) {
      resourceByUrl.set(normalizedUrl, resource);
      continue;
    }

    resourceByUrl.set(normalizedUrl, {
      ...existing,
      required: existing.required || resource.required,
      placement: existing.placement || resource.placement,
      whenToUse: existing.whenToUse ?? resource.whenToUse,
      notes: existing.notes ?? resource.notes,
      why: existing.why ?? resource.why,
      title: existing.title,
      provider: existing.provider,
      url: existing.url,
      type: existing.type,
      level: existing.level,
      checkedAt: existing.checkedAt ?? resource.checkedAt
    });
  }

  const dedupedResources = Array.from(resourceByUrl.values());
  const required = dedupedResources.filter((resource) => resource.required);
  const optional = dedupedResources.filter((resource) => !resource.required);
  const ordered = [...required, ...optional];

  return (
    <section className="mt-6 rounded-lg border border-rule bg-paper p-4">
      <p className="font-mono text-xs font-semibold uppercase text-accent">{title}</p>
      <div className="mt-3 space-y-4">
        {ordered.map((resource, index) => (
          <CuratedResourceCard resource={resource} key={`${resource.url}-${index}`} />
        ))}
      </div>
    </section>
  );
}

export function ExternalResourceWarning() {
  return (
    <section className="mt-4 rounded-lg border border-rule bg-muted p-4 text-sm text-ink-soft">
      <p className="font-semibold text-ink-soft">External learning resources are used as references only.</p>
      <p className="mt-2">
        External resources open in a new tab and remain property of their respective creators.
        AI Foundry does not own, host, or replace this content.
      </p>
    </section>
  );
}

export function CuratedResourcesDisclaimer() {
  return (
    <section className="rounded-lg border border-rule bg-surface p-4 text-sm text-ink-soft">
      <p className="font-semibold text-ink-soft">Curated Resources Disclaimer</p>
      <p className="mt-2">
        AI Foundry curates public learning resources from respected educators and organizations.
        All external content belongs to its original creators. AI Foundry is not affiliated with
        or endorsed by those organizations unless explicitly stated.
      </p>
    </section>
  );
}
