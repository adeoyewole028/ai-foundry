# AI Foundry

AI Foundry is an Odin-style curriculum app for AI engineering with lesson content, quizzes, projects, and progress tracking.

## Quick start

```bash
npm install
npm run dev
```

### Environment variables

Copy `.env.example` (if available) to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

If either variable is missing, the app still renders public lesson content and keeps local progress in the browser.

## Supabase setup (required for sign-in + synced progress)

For authenticated features (dashboard, quiz sync, project submissions), create the following tables and policies in Supabase SQL Editor:

1. Open SQL Editor in your Supabase project.
2. Run the migration in `supabase/schema.sql`.
3. Enable Email auth in the Supabase Auth settings.
4. Keep your app URL in Authentication redirect settings.

`supabase/schema.sql` includes:

- `public.profiles`
- `public.lesson_progress`
- `public.quiz_attempts`
- `public.project_submissions`
- RLS policies for owner-only access
- Helpful indexes for query performance

### Notes

- `quiz_attempts` stores rubric-level scoring metadata for short-answer and multiple-choice assessments.
- `project_submissions` supports portfolio links and status tracking (`submitted`, `reviewed`, `needs_work`).
- Lesson completion is written to `lesson_progress` once a quiz is passed or a project is submitted.

## Commands

```bash
npm run test:smoke
```

Validates:

- curriculum content shape
- lesson/progress utilities
- MDX links
- prerequisite locking behavior

```bash
npm run typecheck
```

Type-checks the app and content models.

## Documentation

- [PRD.md](./PRD.md)
- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- [CURRICULUM_STRUCTURE.md](./CURRICULUM_STRUCTURE.md)
- [AGENT.md](./AGENT.md)
