# AI Foundry — Curriculum Structure

## 1. Curriculum Philosophy

AI Foundry teaches AI like The Odin Project teaches web development:

- Start from zero.
- Explain simply.
- Build constantly.
- Increase difficulty gradually.
- Use real-world projects.
- Make learners create portfolio work.

## 2. Learning Loop

Every topic must follow this loop:

```text
Concept → Simple Explanation → Example → Code → Exercise → Project → Reflection
```

## 3. Explanation Standard

Every new term must be explained using this format:

```md
### Term

Simple meaning:
Explain it like the learner is new.

Real-world analogy:
Compare it with something familiar.

Technical meaning:
Give the proper definition after the simple version.

Example:
Show one practical example.

Why it matters:
Explain where the learner will use it.
```

## 4. Lesson Template

Every lesson should follow this structure:

```md
# Lesson Title

## Objective

By the end of this lesson, you will be able to...

## Prerequisites

Before this lesson, you should understand...

## Plain-English Explanation

Explain the concept simply.

## Key Terms

Define every new term.

## Mental Model

Give an analogy or diagram.

## Example

Show a practical example.

## Code Walkthrough

Show code where useful.

## Common Mistakes

Explain beginner mistakes.

## Exercise

Give a small task.

## Reflection

Ask the learner to explain the concept.

## Further Reading

List resources.

## Completion Checklist

- [ ] I understand...
- [ ] I can explain...
- [ ] I built...
```

## 5. Module Template

Every module should include:

```text
module.json
overview.mdx
lesson-01.mdx
lesson-02.mdx
lesson-03.mdx
exercises.mdx
quiz.mdx
project.mdx
README.md
```

### Quiz Standard

All quizzes are scored with rubric-based checks, not exact-only matching:

- Each question is graded against a rubric so learners can answer in their own words.
- Multi-choice questions should include `correctOptionId` tied to the correct option ID.
- If multiple phrasings are valid, include broader `keywords` and rubric criteria.
- A short-answer question should include:

```json
{
  "id": "q-01",
  "prompt": "Explain ...",
  "correctAnswer": "Instructor model answer",
  "keywords": ["core concept", "supporting concept"],
  "correctOptionId": "correct",
  "rubric": [
    {
      "id": "core-understanding",
      "label": "Core concept(s) explained",
      "required": true,
      "terms": ["embedding", "vector", "semantic similarity"]
    },
    {
      "id": "tradeoff",
      "label": "Mentions a trade-off",
      "required": false,
      "terms": ["latency", "cost", "privacy"],
      "minMatch": 1
    }
  ],
  "passingScore": 2
}
```

Rubric grading contract:

- Criterion `terms` must be normalized (case-insensitive and punctuation-agnostic) and matched against learner text.
- A criterion passes when:
  - `required: true` → all `terms` match; or
  - all other criteria → at least `minMatch` terms match (default `1`).
- A question passes when all required criteria pass and total score >= `passingScore` (default: half the criteria, rounded up).
- Keep the same evaluator for anonymous and authenticated grading flows so local and server results stay equivalent.
- `correctOptionId` remains for MCQ; short-answer answers are scored using rubric criteria.

## 6. Module Requirements

Each module must include:

1. Overview
2. 5–12 lessons
3. Exercises
4. Quiz
5. Mini project
6. Portfolio project
7. Checklist
8. Further reading

## 7. Curriculum Roadmap

### Module 00 — AI Foundations

Goal: Understand AI concepts in plain English.

Lessons:

1. What is AI?
2. Machine Learning vs Deep Learning vs LLMs
3. How AI Learns from Data
4. What Are Models?
5. What Are Tokens?
6. What Are Embeddings?
7. What is RAG?
8. What is an AI Agent?
9. AI Product Thinking
10. AI Limitations and Safety

Project:
Write an AI product idea document.

### Module 01 — Python for AI

Goal: Learn Python for AI workflows.

Lessons:

1. Python setup
2. Variables and data types
3. Lists and dictionaries
4. Functions
5. Classes
6. Files
7. APIs
8. Virtual environments
9. Jupyter notebooks
10. FastAPI introduction

Project:
Build a simple AI-ready API backend.

### Module 02 — Data for AI

Goal: Learn how AI systems use data.

Lessons:

1. What is data?
2. CSV files
3. NumPy
4. Pandas
5. Cleaning data
6. Missing values
7. Data visualization
8. Train/test split

Project:
Build a data analysis notebook.

### Module 03 — Machine Learning

Goal: Build basic predictive models.

Lessons:

1. Features and labels
2. Training and testing
3. Regression
4. Classification
5. Decision trees
6. Random forest
7. Accuracy and evaluation
8. Overfitting

Project:
Build a job match score predictor.

### Module 04 — Deep Learning

Goal: Understand neural networks.

Lessons:

1. What is a neural network?
2. Layers and weights
3. Activation functions
4. Loss functions
5. Backpropagation
6. Optimizers
7. PyTorch basics
8. Image classification

Project:
Build an image classifier.

### Module 05 — LLM Engineering

Goal: Build apps with language models.

Lessons:

1. What is an LLM?
2. Tokens
3. Context windows
4. Prompt engineering
5. Structured outputs
6. Function calling
7. Tool use
8. Evaluation

Project:
Build a resume analyzer.

### Module 06 — RAG

Goal: Build AI that answers from documents.

Lessons:

1. What is RAG?
2. Chunking
3. Embeddings
4. Vector databases
5. Retrieval
6. Re-ranking
7. Citations
8. Evaluation

Project:
Build chat with PDF.

### Module 07 — AI Agents

Goal: Build AI systems that can use tools.

Lessons:

1. What is an agent?
2. Tools
3. Memory
4. Planning
5. Multi-step workflows
6. Human approval
7. Agent failure modes
8. Agent evaluation

Project:
Build a job application assistant agent.

### Module 08 — Fine-Tuning

Goal: Customize models.

Lessons:

1. What is fine-tuning?
2. Datasets
3. Instruction data
4. LoRA
5. QLoRA
6. Evaluation
7. When not to fine-tune

Project:
Fine-tune a small assistant.

### Module 09 — Production AI

Goal: Ship reliable AI products.

Lessons:

1. AI system architecture
2. APIs
3. Queues
4. Evaluation
5. Monitoring
6. Cost control
7. Security
8. Deployment

Project:
Deploy a production AI SaaS feature.

## 8. Project Quality Standard

Every project must include:

- Clear problem
- Required features
- Starter requirements
- Stretch goals
- Evaluation checklist
- Submission instructions
- Portfolio write-up prompt

## 9. Quiz Standard

Quizzes should test understanding, not memorization.

Use:

- Multiple choice
- Short answer
- Explain in your own words
- Debug the concept
- Apply to a scenario

Each short-answer quiz should include an answer key and a grading rubric. During the
content-first milestone, deterministic concept/keyword matching is acceptable as a local
placeholder. When backend grading is implemented, quiz answers should be evaluated against
the rubric, not simple keyword presence, so learners can answer in their own words and still
receive fair pass/fail feedback.

For implementation:

- `POST /progress`-style grading actions should return:
  - `questionId`
  - `criterionResults` (`id`, `passed`, `matchedTerms`, `requiredTerms`)
  - `score`
  - `passed`
- Persisted lesson completion must be based on rubric question-level pass/fail, not answer text equivalence.
- Short-answer feedback should include what was missing and a concrete hint tied to failed criteria.

## 10. Tone and Style

The curriculum must sound:

- Clear
- Practical
- Encouraging
- Direct
- Beginner-friendly
- Professional

Avoid:

- Academic overload
- Undefined jargon
- Long theory without use
- Complex math before intuition
