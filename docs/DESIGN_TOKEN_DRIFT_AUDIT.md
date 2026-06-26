# Design Token Drift Audit (App/Components/Content)

## Scope
- `app/**/*`
- `components/**/*`
- `content/**/*`

## Method
- Added a sweep script at `scripts/check-design-token-drift.mjs`.
- Wired into `npm run test:smoke` through `npm run test:design-tokens`.
- The sweep checks for:
  - Hardcoded color literals (`#fff`, `rgb(...)`, `hsl(...)`, etc.)
  - Hardcoded font declarations (`font-family`, `fontFamily`) not using token references
  - Tailwind utility color classes (`text-red-500`, `bg-slate-100`, etc.)

## Findings
- Current pass result: **No hardcoded color/font tokens were detected** in the scoped directories at time of audit.
- Existing flagged files outside token system were already fixed earlier:
  - `components/lessons/project-submission-form.tsx`
  - `components/lessons/quiz-assessment.tsx`

## Risk Notes
- The script is intentionally strict to prevent accidental drift.
- It may produce false positives if legacy copy/pasted snippets intentionally include hex literals for examples.

## Implementation Recommendation (applied + follow-up)
1. Keep the current automated check running in CI/test smoke.
2. Treat the check as non-blocking only with a temporary allowlist file and explicit ticket reference (not yet added).
3. Add a short contributor reminder to use token classes such as `text-accent`, `bg-surface`, and tokenized spacing/font tokens instead of inline color/family values.
4. Consider extending the audit to support optional inline style parsing once component count grows.

## Commands
- `npm run test:design-tokens` – run token-drift scan only.
- `npm run test:smoke` – full smoke + token scan.
