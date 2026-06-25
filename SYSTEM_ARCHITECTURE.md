# AI Foundry — System Architecture

## 1. Recommended Stack

Use a modern full-stack TypeScript stack.

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui or custom component system
- MDX for content rendering

### Backend

- Next.js server actions or API routes
- Supabase for auth and database
- PostgreSQL database
- Row Level Security

### Hosting

- Vercel for app hosting
- Supabase for database/auth
- GitHub for content and source control

## 2. Core Architecture

AI Foundry should be content-first.

Markdown/MDX files define the curriculum. The app reads those files, renders lessons, and stores user progress in the database.

```text
Content Files → Content Parser → Lesson Pages
                             ↓
User Auth → Progress Database → Dashboard
```

## 3. Folder Structure

```text
ai-foundry/
├── app/
│   ├── page.tsx
│   ├── curriculum/
│   │   ├── page.tsx
│   │   └── [moduleSlug]/
│   │       ├── page.tsx
│   │       └── [lessonSlug]/
│   │           └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── projects/
│   │   └── page.tsx
│   └── auth/
│       ├── login/
│       └── signup/
│
├── components/
│   ├── layout/
│   ├── curriculum/
│   ├── lessons/
│   ├── dashboard/
│   └── ui/
│
├── content/
│   ├── 00-ai-foundations/
│   │   ├── module.json
│   │   ├── lesson-01-what-is-ai.mdx
│   │   ├── lesson-02-machine-learning-vs-deep-learning.mdx
│   │   ├── quiz.mdx
│   │   └── project.mdx
│   └── 01-python-for-ai/
│
├── lib/
│   ├── content.ts
│   ├── progress.ts
│   ├── supabase/
│   └── utils.ts
│
├── docs/
│   ├── PRD.md
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── CURRICULUM_STRUCTURE.md
│   └── AGENT.md
│
└── README.md
```

## 4. Content Model

Each module should have a `module.json` file.

Example:

```json
{
  "title": "AI Foundations",
  "slug": "ai-foundations",
  "order": 0,
  "description": "Understand AI, ML, deep learning, LLMs, RAG, and agents in simple terms.",
  "level": "Beginner",
  "estimatedHours": 8,
  "lessons": [
    {
      "title": "What is AI?",
      "slug": "what-is-ai",
      "file": "lesson-01-what-is-ai.mdx",
      "order": 1,
      "type": "lesson"
    }
  ]
}
```

## 5. Database Schema

### profiles

Stores user profile information.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, same as auth user id |
| full_name | text | Optional |
| avatar_url | text | Optional |
| created_at | timestamptz | Default now |

### lesson_progress

Tracks completed lessons.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | References profiles.id |
| module_slug | text | Module identifier |
| lesson_slug | text | Lesson identifier |
| completed_at | timestamptz | Default now |

Unique constraint:

```sql
unique(user_id, module_slug, lesson_slug)
```

### quiz_attempts

Tracks quiz attempts.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | References profiles.id |
| module_slug | text | Module identifier |
| score | numeric | Quiz score |
| answers | jsonb | Submitted answers |
| feedback | jsonb | Rubric results, expected-answer comparison, and improvement guidance |
| passed | boolean | Whether the learner passed the quiz |
| created_at | timestamptz | Default now |

Backend quiz grading should use rubric-based evaluation for short-answer questions. The
content-first app may use deterministic keyword/concept matching, but the authenticated
backend flow should compare the learner's answer to the stored rubric and expected answer,
return per-question pass/fail feedback, and only mark quiz progress complete when the quiz
passes.

### project_submissions

Tracks project submissions.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | References profiles.id |
| module_slug | text | Module identifier |
| title | text | Project title |
| repo_url | text | GitHub link |
| live_url | text | Demo link |
| notes | text | Learner reflection |
| status | text | submitted, reviewed, needs_work |
| created_at | timestamptz | Default now |

## 6. Routes

### Public Routes

- `/`
- `/curriculum`
- `/curriculum/[moduleSlug]`
- `/curriculum/[moduleSlug]/[lessonSlug]`
- `/projects`
- `/login`
- `/signup`

### Authenticated Routes

- `/dashboard`
- `/settings`
- `/submissions`
- `/curriculum/[moduleSlug]/[lessonSlug]` with progress actions

## 7. Content Rendering

Use MDX so lessons can include:

- headings
- callouts
- code blocks
- diagrams
- interactive components later
- quiz blocks later

Initial rendering can be simple Markdown/MDX with styled typography.

## 8. Progress Logic

A lesson is complete when:

- The authenticated learner clicks "Mark complete".
- A row is inserted into `lesson_progress`.

Dashboard progress:

```text
completed lessons / total lessons * 100
```

Continue learning:

1. Load all modules in order.
2. Load user completed lessons.
3. Find first incomplete lesson.
4. Link user to that lesson.

## 9. Security

- Use Supabase Auth.
- Enable Row Level Security.
- Users can only read/write their own progress.
- Public content files do not require authentication.
- Project submissions belong to the submitting user.

## 10. AI Features Later

Do not add AI features in MVP.

Later additions:

- AI lesson explainer
- AI quiz generator
- AI code reviewer
- AI project mentor
- AI study plan generator
- AI career coach
