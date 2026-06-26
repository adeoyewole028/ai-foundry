# AI Foundry — Product Requirements Document

## 1. Product Summary

AI Foundry is a project-based AI engineering learning platform inspired by The Odin Project. It teaches learners how to move from beginner-level AI understanding to building production-grade AI systems through structured lessons, exercises, quizzes, projects, and portfolio milestones.

The platform is designed for software developers, founders, students, and technical professionals who want to learn AI by building real applications, not by passively watching tutorials.

## 2. Vision

Become the most practical open-source curriculum for learning AI engineering end-to-end.

AI Foundry should help learners:

- Understand AI concepts in simple language.
- Build AI applications step by step.
- Learn Python, practical AI math, data, machine learning, deep learning, LLMs, RAG, agents, fine-tuning, and production AI.
- Create a public portfolio of AI projects.
- Progress from beginner to AI product engineer.

## 3. Target Users

### Primary Users

1. Software developers who want to transition into AI engineering.
2. Startup founders who want to integrate AI into their products.
3. Students who want a practical AI roadmap.
4. Self-taught learners who need structure.

### Secondary Users

1. Technical writers contributing lessons.
2. Mentors reviewing projects.
3. Companies looking for AI engineering talent.

## 4. Core User Problem

AI learning is fragmented. Learners jump between YouTube, Coursera, Hugging Face, GitHub, blogs, and documentation without a clear sequence. Most courses either focus too much on theory or too little on production.

AI Foundry solves this by providing one clear path:

Learn → Practice → Build → Submit → Progress → Portfolio.

## 5. Core Value Proposition

AI Foundry is the Odin-style path for AI engineering:

- One structured curriculum.
- Plain-English explanations.
- Real coding exercises.
- Practical projects.
- Progress tracking.
- Portfolio outcomes.
- AI product focus.

## 6. MVP Scope

The MVP should focus on the learning platform foundation, not advanced AI features.

### MVP Features

1. Landing page
2. Curriculum roadmap
3. Module listing
4. Lesson pages rendered from Markdown/MDX
5. Project pages rendered from Markdown/MDX
6. Quiz pages
7. User authentication
8. Progress tracking
9. Mark lesson complete
10. Continue learning button
11. Dashboard
12. Responsive design
13. Admin-friendly content structure

## 7. Non-MVP Features

These should not be built in the first milestone:

- AI tutor
- Code execution sandbox
- Payment system
- Certificates
- Social/community features
- Mentor marketplace
- Job board
- Advanced analytics
- Mobile app

## 8. MVP User Stories

### Visitor

- As a visitor, I want to understand what AI Foundry teaches.
- As a visitor, I want to view the curriculum roadmap.
- As a visitor, I want to open sample lessons.
- As a visitor, I want to create an account.

### Learner

- As a learner, I want to see all modules in order.
- As a learner, I want to read lessons.
- As a learner, I want to complete quizzes.
- As a learner, I want to mark lessons as complete.
- As a learner, I want to continue from where I stopped.
- As a learner, I want to see my progress percentage.
- As a learner, I want to see required projects.

### Admin/Content Maintainer

- As a maintainer, I want lessons to be stored as Markdown or MDX.
- As a maintainer, I want to add new modules without changing app logic.
- As a maintainer, I want lessons to follow a consistent template.

## 9. Learning Model

Every module should include:

1. Overview
2. Lessons
3. Exercises
4. Quiz
5. Mini project
6. Portfolio project
7. Completion checklist

Every lesson should include:

1. Objective
2. Simple explanation
3. Key terms
4. Examples
5. Code walkthrough
6. Exercise
7. Reflection question
8. Further reading
9. Completion criteria

## 9a. Quiz Grading Model

Quizzes are designed to be reflective and rubric-based, not exact-answer matching.

Grading rules:

- Answers are scored against question-level keyword/idea rubrics defined in lesson metadata.
- Each question defines a list of required concepts (`keywords`).
- An answer passes when it is sufficiently descriptive **and** includes at least half (rounded up) of the required concepts.
- If a question has no rubric keywords, it is treated as pass for any non-empty sufficient answer.
- Passing all quiz questions marks the lesson as complete and unlocks the next step.
- Both client and server must use the same rubric evaluator so score behavior is identical across anonymous and authenticated flows.

## 10. Initial Curriculum

MVP should include at least one complete module:

### Module 00 — AI Foundations

Lessons:

1. What is AI?
2. Machine Learning vs Deep Learning vs LLMs
3. How AI Learns from Data
4. What Are Tokens, Embeddings, and Models?
5. What is RAG?
6. What is an AI Agent?
7. How AI Products Are Built
8. Ethics, Safety, and Limitations

Project:

Write a simple AI product idea document and explain which AI technique it uses.

## 11. Success Metrics

### MVP Success

- User can sign up.
- User can view the curriculum.
- User can read lessons.
- User can mark lessons complete.
- User can see progress.
- Lessons can be added through content files.
- Platform works on desktop and mobile.

### Product Success

- Learners complete modules.
- Learners submit projects.
- Learners build portfolio projects.
- Community contributors add content.
- Learners use the platform to transition into AI roles or build AI products.

## 12. Design Principles

1. Beginner-friendly
2. Project-first
3. Plain English before technical detail
4. No unnecessary complexity
5. Build before theory overload
6. Every concept should lead to application
7. Mobile responsive
8. Fast and lightweight
9. Open-source friendly
10. Codex-maintainable

## 13. Monetization Later

MVP should remain free/open-source.

Possible future monetization:

- Paid certificates
- Mentor reviews
- AI tutor subscription
- Premium projects
- Cohort-based learning
- Company/team accounts
- Job placement partnerships
