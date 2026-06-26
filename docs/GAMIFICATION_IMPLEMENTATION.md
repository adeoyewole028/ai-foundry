# AI Foundry - Gamification Implementation Instructions

## Goal

Transform AI Foundry from a static curriculum platform into a more engaging AI Engineering RPG-style learning experience.

The platform should still feel professional and serious, but learning should feel more rewarding, motivating, and interactive.

The goal is not to add gimmicks. The goal is to make learners feel visible progress as they move from beginner to AI engineer.

## Product Direction

AI Foundry should feel like:

- The Odin Project for structure
- Duolingo for motivation
- GitHub for portfolio/progress
- RPG games for level progression

Learners should feel like they are advancing through an AI engineering journey.

They are not just reading lessons.

They are completing quests, earning XP, unlocking skills, defeating boss battles, and building a public AI portfolio.

## Core Concepts

### 1. XP System

Add an XP system that rewards learning actions.

XP Events

Use these default values:

```ts
const XP_REWARDS = {
  LESSON_COMPLETE: 20,
  EXERCISE_COMPLETE: 50,
  QUIZ_COMPLETE: 75,
  PERFECT_QUIZ: 125,
  PROJECT_SUBMITTED: 200,
  MODULE_COMPLETE: 500,
  BOSS_BATTLE_COMPLETE: 750,
  STREAK_DAY: 25,
};
```

Rules

- XP should only be awarded once per unique action.
- Completing the same lesson multiple times must not duplicate XP.
- XP should be persisted per user.
- XP should be shown on dashboard, curriculum page, and lesson completion feedback.
- Use a simple transaction-safe approach where possible.

### 2. Levels and Titles

Create AI Engineer levels based on total XP.

Example structure:

```ts
const LEVELS = [
  { level: 1, minXp: 0, title: "AI Apprentice" },
  { level: 2, minXp: 200, title: "Python Initiate" },
  { level: 3, minXp: 500, title: "Data Explorer" },
  { level: 4, minXp: 1000, title: "ML Beginner" },
  { level: 5, minXp: 1800, title: "Model Builder" },
  { level: 6, minXp: 2800, title: "Deep Learning Trainee" },
  { level: 7, minXp: 4200, title: "LLM Practitioner" },
  { level: 8, minXp: 6000, title: "RAG Builder" },
  { level: 9, minXp: 8500, title: "Agent Engineer" },
  { level: 10, minXp: 12000, title: "AI Systems Engineer" },
  { level: 15, minXp: 20000, title: "Senior AI Engineer" },
  { level: 20, minXp: 35000, title: "AI Architect" },
];
```

UI

Show:

- Current level
- Current title
- Total XP
- XP needed for next level
- Progress bar to next level

Example:

```txt
Level 4 - ML Beginner
1,240 XP
560 XP to Level 5
```

### 3. Curriculum as Quests

Rename or visually reframe lessons as quests without breaking existing curriculum structure.

Implementation

Keep the technical content model intact:

- modules
- lessons
- projects
- quizzes

But display them with gamified labels:

| Existing Type | Display Label |
| --- | --- |
| Lesson | Quest |
| Exercise | Training Drill |
| Quiz | Knowledge Trial |
| Project | Build Mission |
| Capstone | Final Mission |
| Module | Region / Stage |
| Module Completion | Region Cleared |

Example:

```txt
AI Foundations Village
Quest 1: What is AI?
Quest 2: Machine Learning vs Deep Learning
Knowledge Trial
Build Mission
```

Do not rename database entities yet. Keep the code clean and stable.

### 4. Boss Battles

Add boss battles as module-ending challenges.

A boss battle is a bigger assessment that combines:

- quiz questions
- scenario-based thinking
- small implementation task
- reflection

Content Model

Add optional `bossBattle` to module metadata.

Example:

```json
{
  "bossBattle": {
    "title": "Debug the Confused Chatbot",
    "slug": "debug-the-confused-chatbot",
    "description": "A startup chatbot is giving wrong answers. Diagnose whether the issue is data, prompt, model, or retrieval.",
    "xpReward": 750,
    "required": true
  }
}
```

Boss Battle Page

Route example:

```txt
/curriculum/[moduleSlug]/boss-battle
```

Boss Battle UI

Include:

- Story setup
- Mission objective
- Required tasks
- Submit answer/reflection
- Mark complete
- XP reward
- Completion state

Important

For MVP, boss battles can be Markdown/MDX pages with a completion button.

Do not build complex grading yet.

### 5. Streaks

Add daily learning streaks.

Rules

A streak increases when the user completes at least one meaningful learning action per day.

Meaningful actions:

- completes lesson
- completes quiz
- submits project
- completes boss battle

Streak Logic

Store activity by date.

Basic rules:

- If user completed something today, streak remains active.
- If user completed something yesterday and completes today, streak increases by 1.
- If user misses a full day, streak resets to 1 on next activity.
- Use server date consistently.
- Avoid duplicate streak increments for multiple actions on the same day.

UI

Show:

```txt
5-day streak
```

Display on:

- dashboard
- curriculum page
- lesson completion success state

### 6. Achievement Badges

Add achievement badges.

Initial Badges

```ts
const BADGES = [
  {
    id: "first_quest",
    title: "First Quest",
    description: "Complete your first lesson.",
    icon: "sparkles",
  },
  {
    id: "foundation_finisher",
    title: "Foundation Finisher",
    description: "Complete AI Foundations.",
  },
  {
    id: "quiz_slayer",
    title: "Quiz Slayer",
    description: "Complete your first quiz.",
  },
  {
    id: "builder_1",
    title: "First Build Mission",
    description: "Submit your first project.",
  },
  {
    id: "boss_slayer",
    title: "Boss Slayer",
    description: "Complete your first boss battle.",
  },
  {
    id: "streak_7",
    title: "7-Day Flame",
    description: "Maintain a 7-day learning streak.",
  },
  {
    id: "xp_1000",
    title: "1K XP",
    description: "Earn 1,000 total XP.",
  },
];
```

Rules

- Badges should be awarded automatically after qualifying actions.
- Badges should only be awarded once.
- Show recent badge unlocks.
- Show locked and unlocked badges on dashboard.

### 7. Skill Tree

Add a visual skill tree or skill map.

Skill Categories

Use these initial categories:

- AI Foundations
- Python
- Math
- Data
- Machine Learning
- Deep Learning
- LLMs
- RAG
- Agents
- Fine-Tuning
- Production AI

Skill Node States

Each node should have a state:

- locked
- available
- in_progress
- completed

MVP Implementation

Start with a simple responsive grid or vertical pathway.

Do not overbuild complex canvas/graph logic yet.

Example:

```txt
[AI Foundations] -> [Python for AI] -> [Data] -> [Machine Learning]
```

Each module card should feel like a node in a journey.

### 8. Story Mode

Add light narrative framing.

Do not make the platform childish. Keep it professional.

Story Premise

The learner has joined AI Foundry as an apprentice AI engineer.

Each module represents a new stage of training.

Each project represents a real-world mission.

Example:

```txt
Welcome to AI Foundry.

You have joined as an AI Apprentice. Your first task is to understand what AI actually is before you can build with it.
```

Module Story Examples

AI Foundations:

Your first assignment: a startup team keeps using the word "AI" incorrectly. Your job is to understand the language of AI so you can explain it clearly.

RAG:

A company chatbot keeps hallucinating. Your mission is to connect it to reliable company documents.

Agents:

The team wants an assistant that can not only answer questions but also take actions. Your mission is to design your first AI agent.

Implementation

Add optional `story` field to module metadata.

Example:

```json
{
  "story": {
    "role": "AI Apprentice",
    "setting": "AI Foundations Village",
    "mission": "Learn the language of AI so you can join real product discussions.",
    "mentorNote": "Before you build models, you need to understand what people mean when they say AI."
  }
}
```

Display this on module pages.

### 9. AI Mentor Character

Add a mentor character to guide the learner.

Mentor Name

Use:

```txt
Ada
```

Mentor Role

Ada should:

- explain the purpose of a module
- give encouraging notes
- warn about common mistakes
- congratulate learners after milestones
- appear as a small card, not a chatbot yet

MVP

This is not an AI chatbot yet.

It is a static mentor card using content from metadata.

Example UI:

```txt
Ada's Note:
Many beginners confuse AI and machine learning. In this module, your goal is to explain the difference clearly.
```

Data Model

Add optional `mentorNote` to lessons and modules.

### 10. Portfolio Progress

Add a portfolio-building layer.

Concept

Every major project should become part of the learner's AI portfolio.

Project Submission Fields

Support:

- project title
- GitHub URL
- live demo URL
- short technical write-up
- skills demonstrated
- reflection

Dashboard

Show:

- completed build missions
- submitted projects
- portfolio progress
- missing portfolio items

Future

Later, create public portfolio pages.

For now, keep portfolio private inside dashboard.

## Data Model Additions

Add tables or equivalent data structures.

### xp_events

Tracks XP awards.

Fields:

- id
- user_id
- event_type
- entity_type
- entity_id
- xp_amount
- created_at

Unique constraint:

```txt
unique(user_id, event_type, entity_type, entity_id)
```

This prevents duplicate XP.

### user_stats

Stores aggregate stats.

Fields:

- user_id
- total_xp
- current_level
- current_streak
- longest_streak
- last_activity_date
- updated_at

### achievements

Static definitions can live in code.

### user_achievements

Fields:

- id
- user_id
- achievement_id
- unlocked_at

Unique constraint:

```txt
unique(user_id, achievement_id)
```

### boss_battle_progress

Fields:

- id
- user_id
- module_slug
- boss_battle_slug
- response
- completed_at

Unique constraint:

```txt
unique(user_id, module_slug, boss_battle_slug)
```

## UI Components to Build

Create reusable components.

Gamification Components

- XPBadge
- LevelCard
- LevelProgressBar
- StreakBadge
- AchievementCard
- AchievementGrid
- SkillTree
- QuestCard
- BossBattleCard
- MentorNoteCard
- MissionBriefCard
- CompletionCelebration

Dashboard Components

- StatsOverview
- RecentAchievements
- PortfolioProgress
- ContinueQuestCard

## Pages to Update

### Curriculum Page

Add:

- XP summary
- level summary
- streak badge
- skill tree/pathway view
- quest-style module cards

### Module Page

Add:

- story intro
- mentor note
- quest list
- knowledge trial
- build mission
- boss battle card
- module XP reward

### Lesson Page

Add:

- quest header
- XP reward label
- Ada mentor note
- better completion celebration
- next quest CTA

### Dashboard Page

Add:

- level card
- XP progress
- streak
- achievements
- portfolio progress
- continue quest
- recent activity

## Visual Style

The visual style should be:

- modern
- motivational
- clean
- professional
- slightly game-like
- not childish

Use subtle gaming language:

Good:

- Quest
- Mission
- XP
- Level
- Skill
- Badge
- Boss Battle

Avoid excessive fantasy language like:

- Dragon
- Wizard
- Magic spell
- Dungeon
- Potion

This is an AI engineering learning platform, not a fantasy game.

## Implementation Order

Implement in phases.

### Phase 1 - Gamification Foundation

Build:

- XP constants
- level calculation helper
- achievement definitions
- UI components for XP, levels, and streaks
- dashboard gamification summary

Do not alter lesson completion logic yet.

### Phase 2 - XP Integration

Update completion actions:

- lesson complete awards XP
- quiz complete awards XP
- project submitted awards XP
- module complete awards XP
- streak updates after learning action

Ensure duplicate XP is prevented.

### Phase 3 - Quest UI

Update curriculum/module/lesson pages:

- lesson = quest
- project = build mission
- quiz = knowledge trial
- module = stage/region
- show XP rewards
- show progress more visibly

### Phase 4 - Badges

Add:

- user achievements
- automatic badge unlock checks
- dashboard badge grid
- recent unlock feedback

### Phase 5 - Boss Battles

Add:

- content model support
- boss battle route
- boss battle page
- completion tracking
- XP reward

### Phase 6 - Story and Mentor Layer

Add:

- module story metadata
- lesson mentor notes
- Ada mentor card
- mission brief cards

### Phase 7 - Portfolio Layer

Improve project submissions:

- skills demonstrated
- reflection
- portfolio progress
- dashboard portfolio section

## Acceptance Criteria

The implementation is acceptable only if:

1. Existing curriculum still works.
2. Existing completion progress is not broken.
3. XP cannot be duplicated for the same action.
4. User level is derived from XP.
5. Dashboard shows XP, level, streak, and achievements.
6. Curriculum page feels more like a learning journey.
7. Module page displays quests and mission framing.
8. Lesson page gives better completion feedback.
9. Boss battles can be added through content metadata.
10. Mobile layout remains clean.
11. No AI chatbot is added yet.
12. No payment features are added.
13. Gamification remains professional, not childish.

## First Codex Prompt

Use this prompt to start implementation:

```txt
Read AGENT.md and docs/GAMIFICATION_IMPLEMENTATION.md.

Implement Phase 1 only.

Goal:
Add the gamification foundation without breaking existing curriculum functionality.

Tasks:
1. Add XP reward constants.
2. Add level calculation helper.
3. Add achievement definitions.
4. Add reusable UI components:
   - XPBadge
   - LevelCard
   - LevelProgressBar
   - StreakBadge
   - AchievementCard
   - AchievementGrid
5. Update dashboard or curriculum header to display placeholder/current user gamification stats.
6. Do not change database schema yet unless existing architecture already supports it.
7. Do not implement AI tutor, payments, or boss battles yet.
8. Keep implementation typed, responsive, and consistent with the existing design system.

After implementation, report:
- Files changed
- Components created
- Any assumptions made
- Next recommended phase
```
