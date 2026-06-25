# AI Foundry Codex Pack

This pack contains the first implementation documents for building AI Foundry, an Odin-style AI engineering learning platform.

## Files

- `PRD.md` — product requirements and MVP scope
- `SYSTEM_ARCHITECTURE.md` — recommended technical architecture
- `CURRICULUM_STRUCTURE.md` — lesson/module design system
- `AGENT.md` — Codex instructions for implementation

## How to Use With Codex

1. Create a new repository called `ai-foundry`.
2. Add these files into a `/docs` folder.
3. Copy `AGENT.md` into the project root if your coding agent reads root-level instruction files.
4. Ask Codex to implement the project in milestones.

Suggested first prompt:

```text
Read docs/PRD.md, docs/SYSTEM_ARCHITECTURE.md, docs/CURRICULUM_STRUCTURE.md, and AGENT.md.

Implement Milestone 1 only:
- Next.js + TypeScript + Tailwind foundation
- Landing page
- Curriculum page
- Module page
- Lesson page
- Markdown/MDX content loader
- One complete AI Foundations module with at least 3 lessons

Do not add Supabase or auth yet.
Keep the implementation simple, typed, responsive, and production-quality.
```
