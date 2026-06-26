# AI Foundry — Curated Resources Implementation Instructions

## Goal

Update AI Foundry so it does not only contain original lessons, but also acts as a curated learning path through the best AI engineering resources available online.

The platform should help learners answer:

1. What should I understand?
2. What is the best resource to learn it?
3. What should I build to prove I understand it?

AI Foundry should not simply copy external courses or content. It should reference, organize, and contextualize them inside our own structured curriculum.

---

## Product Direction

AI Foundry should become:

“The Odin Project-style curated path for AI engineering.”

That means each module and lesson should include:

- AI Foundry's own simple explanation
- Carefully selected external resources
- A practical exercise
- A project
- A reflection prompt
- A portfolio outcome

Do not turn the platform into a link dump.

Each resource must have a reason for being included.

---

## Curated Resource Types

```
type CuratedResourceType =
  | "course"
  | "video"
  | "playlist"
  | "article"
  | "book"
  | "github"
  | "documentation"
  | "project-library"
  | "paper"
  | "guide"
```

## Borrowed Roadmap Resources

1. Python Foundations — CS50P
   - Use as primary for Module 01 Python for AI.
   - `https://pll.harvard.edu/course/cs50s-introduction-programming-python`

2. DeepLearning.AI AI Python for Beginners
   - Use as bridge resource between Python and AI workflows, placed before Math/Data modules.
   - `https://www.deeplearning.ai/courses/ai-python-for-beginners/`

3. 3Blue1Brown Visual LLM Explanations
   - Use for visual intuition in Math, Deep Learning, and LLM Engineering.
   - `https://www.3blue1brown.com/topics/neural-networks`

4. Andrej Karpathy — Neural Networks: Zero to Hero
   - Use as advanced build track in Deep Learning and LLM Engineering.
   - `https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ`

5. Anthropic — Building Effective Agents
   - Use as conceptual foundation in AI Agents module.
   - `https://www.anthropic.com/engineering/building-effective-agents`

6. CrewAI Multi AI Agent Systems with CrewAI
   - Optional applied framework example in AI Agents.
   - `https://www.coursera.org/projects/multi-ai-agent-systems-with-crewai`

7. MCP Practical Guide
   - Use in AI Agents and Production AI for tool/API integration practicals.
   - `https://mcp.dailydoseofds.com/`

8. AI Engineering Hub
   - Use as open-source project inspiration and optional stretch list.
   - `https://github.com/patchy631/ai-engineering-hub`

9. Chip Huyen — AI Engineering
   - Use in LLM Engineering, RAG, Production AI, and final reading.
   - long-form foundation book recommendation.

---

## UI Components to Build

- `CuratedResourceCard`
- `CuratedResourceList`
- `ResourceBadge`
- `ExternalResourceWarning`
- Attribution / disclaimer component

Curated Resource card should show title, provider, type, level, required/optional status, why this resource matters, when to use, and a safe external link button.

---

## Data Model

Add a curated resource model and optional support on module and lesson metadata.

```
type CuratedResourceType =
  | "course" | "video" | "playlist" | "article" | "book" | "github"
  | "documentation" | "project-library" | "paper" | "guide";

type CuratedResource = {
  title: string;
  provider: string;
  url: string;
  type: CuratedResourceType;
  level: string;
  placement: string;
  why: string;
  required: boolean;
  whenToUse?: string;
  notes?: string;
};
```

Add this to:

- Module metadata
- Lesson metadata

---

## UI Placement

- Every lesson should be able to show:
  - AI Foundry explanation
  - Recommended resource
  - Exercise
  - Project
  - Reflection

- Every module should show:
  - module story
  - learning objectives
  - required curated resources
  - optional advanced resources
  - quest list
  - project / boss battle

- Curriculum page should include a curated section for:
  - CS50P, DeepLearning.AI, 3Blue1Brown, Karpathy, Anthropic, Hugging Face, Chip Huyen, AI Engineering Hub
  - with legal-safe phrasing and no partnership claims.

---

## Attribution and Legal Safety

- Do not copy external content.
- Only link and explain why each resource is useful.
- Include explicit attribution and ownership language.
- Do not imply endorsements/affiliation unless stated.

Suggested disclaimer:

“AI Foundry curates public learning resources from respected educators and organizations. All external content belongs to its original creators. AI Foundry is not affiliated with or endorsed by these organizations unless explicitly stated.”

---

## Implementation Scope Right Now

Per request, implement only Phase 1 and Phase 2:

1. Add `CuratedResource` type and curated resources fields to module and lesson metadata.
2. Build:
   - `CuratedResourceCard`
   - `CuratedResourceList`
   - `ResourceBadge`
   - `ExternalResourceWarning`
3. Add safe external-link behavior for resource links.
4. Add attribution/disclaimer component.
5. Add a single sample curated resource on one module to prove the system.
6. Keep existing lesson rendering, progress tracking, gamification, and locking behavior intact.

---

## First Codex Prompt

Read AGENT.md, CURRICULUM_STRUCTURE.md, GAMIFICATION_IMPLEMENTATION.md, and docs/CURATED_RESOURCES_IMPLEMENTATION.md.

Implement Phase 1 and Phase 2 only.

### Report

- Files changed
- Types added
- Components added
- Sample resource added
- Next phase recommendation
