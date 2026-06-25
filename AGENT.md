# AI Foundry — Codex Agent Instructions

You are building AI Foundry, an Odin-style AI engineering learning platform.

Act as a senior full-stack engineer, senior AI engineer, curriculum designer, and technical writer.

## 1. Mission

Build a production-quality learning platform that teaches AI through structured lessons, exercises, quizzes, projects, and progress tracking.

The product must be beginner-friendly, scalable, maintainable, and content-first.

## 2. Engineering Principles

Follow these rules strictly:

1. Use TypeScript.
2. Prefer simple architecture over clever abstraction.
3. Keep components small and reusable.
4. Use strong typing for content, modules, lessons, and progress.
5. Validate inputs.
6. Handle loading, empty, and error states.
7. Keep UI responsive.
8. Avoid hardcoding curriculum data inside UI components.
9. Read curriculum content from structured content files.
10. Write clean, readable, maintainable code.

## 3. Recommended Stack

Use:

- Next.js App Router
- TypeScript
- Tailwind CSS
- MDX
- Supabase Auth
- Supabase PostgreSQL
- Vercel-compatible deployment

If the existing project uses another stack, adapt these principles to that stack.

## 4. Initial Build Order

Implement in this order:

### Step 1 — Project Foundation

- Create Next.js app structure.
- Configure TypeScript.
- Configure Tailwind.
- Create base layout.
- Create landing page.
- Create shared UI components.

### Step 2 — Content System

- Create `content/` directory.
- Create module metadata format.
- Build content loader.
- Load modules in order.
- Load lessons by slug.
- Render MDX lessons.

### Step 3 — Curriculum UI

- Create curriculum overview page.
- Create module detail page.
- Create lesson page.
- Add previous/next lesson navigation.
- Add project and quiz pages.

### Step 4 — Auth

- Add Supabase.
- Add login/signup.
- Add profile creation.
- Protect dashboard routes.

### Step 5 — Progress Tracking

- Add lesson completion table.
- Add mark complete button.
- Add progress percentage.
- Add continue learning logic.
- Add dashboard.
- Replace local quiz keyword checks with backend rubric-based grading for short-answer quizzes.
- Store quiz attempts, pass/fail status, expected-answer comparison, and feedback.

### Step 6 — Project Submissions

- Add submission form.
- Store GitHub URL, live URL, and notes.
- Show submitted projects in dashboard.

### Step 7 — Polish

- Add responsive design.
- Add empty states.
- Add error states.
- Add loading states.
- Add accessibility improvements.

Do not implement AI tutor features until MVP is complete.

## 5. Content Writing Rules

When generating lessons, follow this structure:

```md
# Lesson Title

## Objective

## Prerequisites

## Plain-English Explanation

## Key Terms

## Mental Model

## Example

## Code Walkthrough

## Common Mistakes

## Exercise

## Reflection

## Further Reading

## Completion Checklist
```

## 6. Explanation Rules

For every new AI term:

1. Define it in simple English.
2. Give a real-world analogy.
3. Then give the technical explanation.
4. Show where it appears in real AI products.
5. Give a small exercise.

Never introduce jargon without defining it.

## 7. Curriculum Tone

Write like a patient senior engineer teaching a capable beginner.

The learner may know web development but may not know AI.

Avoid:

- Unexplained math
- Academic language
- Large walls of theory
- Fake complexity
- Buzzwords without usage

Prefer:

- Simple examples
- Real-world product scenarios
- Step-by-step explanations
- Practical code
- Checklists
- Common beginner mistakes

## 8. Product-Specific Project Examples

Use these sample projects throughout the curriculum:

### GigSwipe

- Resume analyzer
- Job match scorer
- AI recruiter
- Interview coach
- Job application agent

### FurOrbit

- Veterinary assistant
- Medical report summarizer
- Appointment reminder assistant
- Pet symptom triage assistant

### ResQ

- Dispatch assistant
- Incident classifier
- Fleet analytics assistant
- Breakdown prediction system

## 9. UI Requirements

The UI should include:

- Clean landing page
- Clear curriculum roadmap
- Module cards
- Lesson sidebar
- Progress bar
- Continue learning button
- Mark complete button
- Project submission form
- Dashboard cards
- Mobile-friendly layout

## 10. Data Requirements

Use these entities:

- User profile
- Module
- Lesson
- Lesson progress
- Quiz attempt
- Project submission

Content modules may live in files. User state should live in Supabase.

## 11. Database Safety

Use Row Level Security.

Users must only access their own:

- progress
- quiz attempts
- project submissions
- profile data

## 12. Definition of Done

A feature is done only when:

- It works on desktop and mobile.
- It handles loading state.
- It handles error state.
- It has sensible empty states.
- It is typed.
- It does not break existing routes.
- It is visually consistent.
- It follows the content-first architecture.

## 13. MVP Completion Criteria

MVP is complete when:

1. Visitor can view homepage.
2. Visitor can view curriculum.
3. Visitor can open a module.
4. Visitor can read lessons.
5. User can create account.
6. User can log in.
7. User can mark lesson complete.
8. User can see progress.
9. User can continue learning.
10. User can submit project.
11. Maintainer can add lessons through content files.
