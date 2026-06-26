import Link from "next/link";
import { Award, CheckCircle2, Code2, Flame, Lock, Sparkles, Telescope, Trophy, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { type AchievementDefinition, formatXp, type LevelProgress } from "@/lib/gamification";

type XPBadgeProps = {
  xp: number;
  label?: string;
  className?: string;
};

export function XPBadge({ xp, label = "XP", className }: XPBadgeProps) {
  const xpLabel = label && label.toLowerCase() !== "xp" ? `${label}:` : "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-bold text-accent",
        className
      )}
    >
      <Sparkles className="size-3.5" aria-hidden="true" />
      {xpLabel && <span>{xpLabel}</span>}
      <span>{formatXp(xp)}</span>
    </span>
  );
}

type LevelProgressBarProps = {
  progress: number;
  label?: string;
};

export function LevelProgressBar({ progress, label = "Level progress" }: LevelProgressBarProps) {
  const normalizedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-ink-soft">
        <span>{label}</span>
        <span>{normalizedProgress}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
        <div className="h-full rounded-full bg-accent" style={{ width: `${normalizedProgress}%` }} />
      </div>
    </div>
  );
}

type LevelCardProps = {
  levelProgress: LevelProgress;
  className?: string;
};

export function LevelCard({ levelProgress, className }: LevelCardProps) {
  const { currentLevel, nextLevel, totalXp, xpRemaining, progressPercent } = levelProgress;

  return (
    <section className={cn("rounded-xl border border-rule bg-surface p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase text-ink-soft">Engineer level</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.02em] text-ink">
            Level {currentLevel.level} - {currentLevel.title}
          </h2>
        </div>
        <XPBadge xp={totalXp} />
      </div>
      <div className="mt-5">
        <LevelProgressBar progress={progressPercent} />
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        {nextLevel
          ? `${formatXp(xpRemaining)} to Level ${nextLevel.level} - ${nextLevel.title}`
          : "You have reached the highest published level."}
      </p>
    </section>
  );
}

type StreakBadgeProps = {
  days: number;
  className?: string;
};

export function StreakBadge({ days, className }: StreakBadgeProps) {
  const hasStreak = days > 0;

  return (
    <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold",
          hasStreak
            ? "border-accent/25 bg-accent/10 text-accent"
            : "border-rule bg-surface text-ink-soft",
          className
        )}
    >
      <Flame className="size-3.5" aria-hidden="true" />
      {hasStreak ? `${days}-day streak` : "Start streak"}
    </span>
  );
}

type AchievementCardProps = {
  achievement: AchievementDefinition;
  unlocked?: boolean;
};

const achievementIcons = {
  award: Award,
  check: CheckCircle2,
  code: Code2,
  flame: Flame,
  sparkles: Sparkles,
  trophy: Trophy
};

export function AchievementCard({ achievement, unlocked = false }: AchievementCardProps) {
  const Icon = achievement.icon ? achievementIcons[achievement.icon] : Award;

  return (
    <article
      className={cn(
        "rounded-lg border p-4 transition",
        unlocked ? "border-accent/30 bg-accent/10" : "border-rule bg-surface"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
            unlocked ? "bg-accent text-surface" : "bg-ink/10 text-ink-soft"
          )}
        >
          {unlocked ? <Icon className="size-4" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
        </div>
        <div>
          <h3 className="text-sm font-bold text-ink">{achievement.title}</h3>
          <p className="mt-1 text-xs leading-5 text-ink-soft">{achievement.description}</p>
          <p className="mt-2 font-mono text-[0.68rem] font-semibold uppercase text-ink-soft">
            {unlocked ? "Unlocked" : "Locked"}
          </p>
        </div>
      </div>
    </article>
  );
}

type AchievementGridProps = {
  achievements: readonly AchievementDefinition[];
  unlockedAchievementIds?: readonly string[];
  title?: string;
};

export function AchievementGrid({
  achievements,
  unlockedAchievementIds = [],
  title = "Achievement badges"
}: AchievementGridProps) {
  const unlockedSet = new Set(unlockedAchievementIds);

  return (
    <section className="rounded-xl border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase text-ink-soft">{title}</p>
          <h2 className="mt-2 text-xl font-bold text-ink">
            {unlockedSet.size} of {achievements.length} unlocked
          </h2>
        </div>
        <Award className="size-5 text-accent" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {achievements.map((achievement) => (
          <AchievementCard
            achievement={achievement}
            key={achievement.id}
            unlocked={unlockedSet.has(achievement.id)}
          />
        ))}
      </div>
    </section>
  );
}

type RecentAchievementsProps = {
  achievements: readonly AchievementDefinition[];
  recentAchievementIds: readonly string[];
};

export function RecentAchievements({ achievements, recentAchievementIds }: RecentAchievementsProps) {
  const unlockedSet = new Set(recentAchievementIds);
  const titleById = new Map(achievements.map((achievement) => [achievement.id, achievement.title]));
  const descriptions = Array.from(unlockedSet).map((achievementId) => titleById.get(achievementId)).filter(Boolean) as string[];

  return (
    <section className="rounded-xl border border-rule bg-surface p-5">
      <p className="font-mono text-xs font-semibold uppercase text-ink-soft">Recent unlocks</p>
      <h2 className="mt-2 text-xl font-bold text-ink">Badge updates</h2>
      {descriptions.length > 0 ? (
        <ul className="mt-4 grid gap-2 text-sm">
          {descriptions.map((title) => (
            <li className="flex items-start gap-2 text-ink" key={title}>
              <span className="mt-2 inline-block size-1.5 rounded-full bg-accent" />
              <span>{title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">No new badges unlocked yet.</p>
      )}
    </section>
  );
}

type MentorNoteCardProps = {
  mentorName: string;
  role: string;
  note: string;
  className?: string;
};

export function MentorNoteCard({ mentorName, role, note, className }: MentorNoteCardProps) {
  return (
    <section className={cn("rounded-xl border border-rule bg-paper p-4", className)}>
      <div className="flex items-start gap-2">
        <UserRound className="mt-0.5 size-5 text-accent" aria-hidden="true" />
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            {mentorName} note
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">{role}</p>
          <p className="mt-2 text-sm leading-7 text-ink-soft">{note}</p>
        </div>
      </div>
    </section>
  );
}

type MissionBriefCardProps = {
  setting: string;
  mission: string;
  mentorNote?: string;
  className?: string;
};

export function MissionBriefCard({ setting, mission, mentorNote, className }: MissionBriefCardProps) {
  return (
    <section className={cn("rounded-xl border border-rule bg-surface p-4", className)}>
      <div className="flex items-center gap-2">
        <Telescope className="size-5 text-accent" aria-hidden="true" />
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          Mission brief
        </p>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-ink">Setting:</span> {setting}
        </p>
        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-ink">Objective:</span> {mission}
        </p>
        {mentorNote ? (
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">Mentor warning:</span> {mentorNote}
          </p>
        ) : null}
      </div>
    </section>
  );
}

type PortfolioMissionStatus = {
  moduleSlug: string;
  lessonSlug: string;
  lessonTitle: string;
  moduleTitle: string;
};

type PortfolioProgressProps = {
  completedMissions: number;
  totalMissions: number;
  missingMissions: readonly PortfolioMissionStatus[];
  className?: string;
  title?: string;
};

export function PortfolioProgress({
  completedMissions,
  totalMissions,
  missingMissions,
  className,
  title = "Portfolio progress"
}: PortfolioProgressProps) {
  const total = Math.max(0, totalMissions);
  const completed = Math.max(0, Math.min(total, completedMissions));
  const remaining = Math.max(0, total - completed);
  const percent = total === 0 ? 100 : Math.round((completed / total) * 100);

  return (
    <section className={cn("rounded-xl border border-rule bg-surface p-5", className)}>
      <p className="font-mono text-xs font-semibold uppercase text-ink-soft">{title}</p>
      <h2 className="mt-2 text-xl font-bold text-ink">
        {completed} of {total} build missions documented
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        {total === 0
          ? "No build missions published yet."
          : `${remaining} mission${remaining === 1 ? "" : "s"} remaining to document in your private portfolio.`}
      </p>
      {total > 0 ? (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-ink-soft">
            <span>Completion</span>
            <span>{percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : null}
      {missingMissions.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          {missingMissions.map((mission) => (
            <li key={`${mission.moduleSlug}::${mission.lessonSlug}`} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 text-ink-soft" aria-hidden="true" />
              <Link
                className="hover:text-ink"
                href={`/curriculum/${mission.moduleSlug}/${mission.lessonSlug}`}
              >
                <span className="font-semibold text-ink">{mission.moduleTitle}</span>: {mission.lessonTitle}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">All published build missions are documented.</p>
      )}
    </section>
  );
}
