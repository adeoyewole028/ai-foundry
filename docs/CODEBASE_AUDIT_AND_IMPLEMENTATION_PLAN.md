# AI Foundry Codebase Audit & Implementation Plan

**Date:** 2026-06-26  
**Scope:** Full repository audit (runtime, curriculum engine, auth/progress flow, UI/UX, tests, and architecture docs).

## Sources Used
- [AGENTS.md](/Users/hgh/Documents/AI Foundry/AGENT.md)
- [PRD.md](/Users/hgh/Documents/AI Foundry/PRD.md)
- [CURRICULUM_STRUCTURE.md](/Users/hgh/Documents/AI Foundry/CURRICULUM_STRUCTURE.md)
- [SYSTEM_ARCHITECTURE.md](/Users/hgh/Documents/AI Foundry/SYSTEM_ARCHITECTURE.md)
- [GAMIFICATION_IMPLEMENTATION.md](/Users/hgh/Documents/AI Foundry/docs/GAMIFICATION_IMPLEMENTATION.md)
- [CURATED_RESOURCES_IMPLEMENTATION.md](/Users/hgh/Documents/AI Foundry/docs/CURATED_RESOURCES_IMPLEMENTATION.md)
- `/Users/hgh/Documents/AI Foundry` codebase files (all application folders under `app`, `components`, `lib`, `content`, `scripts`, and `supabase`)

I also used the product/system design guidance from:
- [product-design-pattern](/Users/hgh/.codex/skills/product-design-pattern/SKILL.md)
- [system-design-pattern](/Users/hgh/.codex/skills/system-design-pattern/SKILL.md)

## What’s Working Well
- Curriculum and lesson metadata loading are stable and validated by scripts:
  - curriculum structure, quiz links, prerequisite behavior, and progress math currently pass (`npm run test:smoke` equivalent checks): `test:curriculum`, `test:links`, `test:prerequisites`, `test:progress`.
- Public and auth-optional behavior exists:
  - Local progress for anonymous users and Supabase sync for authenticated users.
  - Public learning pages render without auth keys as promised in README (`README.md:19`).
- Curated resource model and schema parsing are already present in `lib/content.ts`:
  - `CuratedResourceType`, `CuratedResource`, module `curatedResources`, and lesson `curatedResources`.
- Quiz engine is centralized and can grade short-answer via rubric and MCQ by selected option in `lib/quiz-grading.ts`.
- RLS and progress tables exist in `supabase/schema.sql`, including event-based XP and lesson progress tracking.

## Phase 5 — Curated Resources Quality Review

Execution date: 2026-06-26

Scope covered:
- Curated resources data model integrity
- Module + lesson rendering behavior
- External-link safety and UX
- Integration completeness against implementation plan and acceptance criteria

### Evidence collected
- `npm run test:smoke` ✅
- `npm run typecheck` ✅
- Curated resources loaded and parsed in `lib/content.ts` (`CuratedResourceType`, `CuratedResource`, and module/lesson `curatedResources` fields).
- Rendering coverage:
  - `app/curriculum/page.tsx` (roadmap + disclaimer)
  - `app/curriculum/[moduleSlug]/page.tsx` (module-level section + warning + disclaimer)
  - `app/curriculum/[moduleSlug]/[lessonSlug]/page.tsx` (lesson-level section + warning)
- UI coverage:
  - `components/curriculum/curated-resources.tsx`
    (`ResourceBadge`, `CuratedResourceCard`, `CuratedResourceList`, `ExternalResourceWarning`, `CuratedResourcesDisclaimer`)
- Safe external link behavior: `getLinkTarget(...)` now drives target/rel for external resource links.

### Acceptance criteria check (curated resources)
1. Modules can define curated resources. ✅ (`module.json` now includes curated resources for all 11 modules)
2. Lessons can define curated resources. ✅ (lesson-level `curatedResources` present in module metadata across the curriculum where needed)
3. Curated resources render on module pages. ✅
4. Curated resources render on lesson pages. ✅
5. Each resource includes reason for inclusion. ✅ (`why` is required during parse)
6. External links open safely. ✅ (target + rel via `getLinkTarget`)
7. Curriculum page communicates curated roadmap role. ✅ (roadmap/positioning text + partner cards)
8. Attribution/disclaimer exists. ✅ (`CuratedResourcesDisclaimer`)
9. No copied external content. ⏳ not programmatically verifiable; content strategy currently links + summarises only
10. Works without curated resources on module/lesson. ✅ (`CuratedResourceList` is conditional)

### Quantitative checks
- Modules scanned: 11  
- Lessons scanned: 124
- Module curated resource entries: 29
- Lesson curated resource entries: 42
- Required resources: 16
- Optional resources: 55
- Modules with no curated resources: 0

### Gaps remaining from a quality perspective
1. Link and resource duplication:
   - Reduced via dedupe by URL in the curated resource list, but modules can still use duplicates for context before/after merge.
2. Visibility and trust:
   - Added optional `checkedAt` support and seeded initial roadmap resources; optional rollout remains for broader content.
3. Quiz + progress experience:
   - These remain the highest UX friction points from earlier phases (especially short-answer confidence and lock/continue flows) and should stay in active backlog.

### Recommendation for next immediate phase
Continue with UX continuity fixes for lesson-level navigation and modal messaging, then tune quiz/short-answer feedback.

## High-Value Findings (with priority)

### P0/P1: Mobile navigation and discoverability gaps
- The top header shows desktop-only nav links and a single menu icon on mobile that only links to dashboard/login, leaving curriculum discovery in `/curriculum`, `/quizzes`, `/projects` harder on smaller screens (`components/layout/site-header.tsx:56-83`).
- This conflicts with the mobile/responsive requirement in PRD (`PRD.md:201-203`) and product design guidance for always reachable navigation.

### P1: Lock/modal behavior clarity and consistency
- Top-nav and list-based resource cards use multiple inline modal patterns (`ProgressNavButton`, `LearningPathStep`, `ResourceIndexList`) with duplicated confirmation flows, each implementing custom inline dialogs with no focus trap/restore or Escape handling (`components/layout/progress-nav-button.tsx:158-237`, `components/curriculum/learning-path-step.tsx:60-121`, `components/curriculum/resource-index-list.tsx:185-238`).
- Gated behavior for `/quizzes` and `/projects` is active on navigation action and computes the “next”/required lesson dynamically (`components/layout/progress-nav-button.tsx:26-34`, `components/layout/progress-nav-button.tsx:137-149`), which can surprise users when they expect catalog-style browsing.
- Module and lesson pages still allow read access to content, but navigation from index pages can force interruption before users understand what is locked.

### P1: Mobile-first experience in lesson mode still risks stacked/hidden actions
- Several layouts rely on fixed/scroll patterns and long stacked surfaces; there is no dedicated mobile layout verification test or guardrails around touch-first CTA visibility for long lesson pages.
- This is a product-design UX risk, though not a blocking functional regression.

### P2: Quiz short-answer scoring UX needs stronger rubric transparency
- Short-answer grading quality model is correct direction, but thresholding still strongly depends on description length in keyword evaluation (`lib/quiz-grading.ts`): `evaluateKeywordMatch` requires long answers in some flows (`requireReasonableLength`), and short answers can be marked low-confidence even when concepts are present.
- This risks false negatives for concise but correct responses, especially while rubric evaluation is expected to support “own words” answers (`CURRICULUM_STRUCTURE.md:139-150`, `CURRICULUM_STRUCTURE.md:413-427`).
- We also still need requirement from your thread to persist rubric criteria feedback clearly for the learner-facing explanation.

### P2: Sync reliability and recovery signal
- Sync paths are robust but silent on partial failure:
  - local progress parse/sync in auth actions and progress actions catches errors and returns no user-facing message in some paths (`app/auth/actions.ts:30-53`, `app/progress/actions.ts:237-254`).
- Users can see no clear status when sync fails, which can diverge trust in progress/XP outcomes.

### P2/P3: Tooling reliability
- `npm run lint` currently fails due incorrect project directory resolution in this environment (`next lint` -> `/Users/hgh/Documents/AI Foundry/lint`) despite other tests passing.
- This blocks quality enforcement if CI depends on lint.

## Additional Observations
- `LessonAccessGate` and `ModuleAccessGate` clearly separate “browse vs complete” concerns and keep locked progression mostly coherent (`components/curriculum/lesson-access-gate.tsx`, `components/curriculum/module-access-gate.tsx`).
- `App` currently handles content accessibility and prerequisite logic by route-level gates and page-level components instead of middleware, which is a healthy pattern for this flow.
- External link rendering in MDX includes `target="_blank"` behavior and new-tab indicators, and tests confirm this (`mdx-components.tsx`, `scripts/check-mdx-links.mjs`).

## Risk Matrix
- P1 risks mainly affect user experience and first-run retention.
- P2 risks affect grading trust and retention.
- P3 risks are operational but lower impact.

## Implementation Plan (phased)

### Phase 1 — Product UX and Navigation (Highest Impact)
1. Implement mobile shell navigation (drawer or bottom navigation) from `components/layout/site-header.tsx`.
2. Make `/curriculum`, `/quizzes`, `/projects` always browsable from every viewport while still showing clear continuation affordance.
3. Standardize a single `ProgressInterruptionModal` component used by `ProgressNavButton`, `LearningPathStep`, and `ResourceIndexList`.
4. Add escape-key close + focus trap + focus restore in interruption modals.

### Phase 2 — Learn-to-Do Flow Refinement
1. Clarify locked/continue messaging around why a section is blocked and where continue will send users.
2. Add mobile behavior smoke checks for lesson mode top-of-page navigation and CTA visibility.
3. Add regression tests for:
   - top-nav open behavior per viewport,
   - modal open/close accessibility,
   - quiz/project index card lock transitions.

### Phase 3 — Quiz Fidelity and Feedback Quality
1. Tune short-answer minimum-length thresholds for criterion-based grading.
2. Ensure rubric criterion feedback surfaces failed concepts with recovery hints in UI and persistence payload.
3. Keep client/server grading parity via shared evaluator contract and tests on both ends.

### Phase 4 — Reliability, Observability, and Docs
1. Add explicit sync status to local→server sync actions (pending, success, partial-fail, retry).
2. Resolve lint script invocation issue (`scripts`/CI path) and add it to smoke gate.
3. Update architecture/runbook notes for mobile and accessibility obligations and keep AGENT/PRD alignment notes current.

## Suggested Immediate Next Step (from your repeated “go ahead” requests)
Start with **Phase 1** to remove navigation + modal friction, then move into **Phase 3** so quiz behavior is less punitive and more explanatory while preserving your in-order learning design.
