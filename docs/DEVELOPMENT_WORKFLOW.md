# Development Workflow

## Milestones
Work one milestone at a time. Do not start the next milestone without a request or clear approval.

### 0 — Repository reconnaissance
- Inspect package scripts, dependencies, source structure, and existing conventions.
- Report the current state and any blockers.
- Do not rewrite or scaffold over an existing project.

### 1 — Foundation
- Establish the app shell, typography, color tokens, responsive baseline, and route/experience state.
- Add only the dependencies needed for the first implementation milestone.

### 2 — Shared gateway
- Build the static starfield and START interaction first.
- Add the particle burst and particle typography reveal.
- Add invitation-code UI and portal transition.
- Keep each effect independently testable and provide fallback behaviour.

### 3 — Personal page template
- Implement the minimal dark message layout with restrained starfield.
- Use placeholder content clearly marked as placeholder.
- Keep content data separate from layout.

### 4 — Recipient variants
- Add recipient-specific content/theme only after details are provided.
- Verify the two variants remain separate.

### 5 — Ending and optional interaction
- Implement distinct endings when their messages are ready.
- Implement Page 4 only after an explicit decision.

### 6 — Polish
- Responsive and accessibility pass.
- Reduced-motion and performance pass.
- Test both invitation paths and the full journey.
- Production build and deployment preparation.

## Agent task loop
For each task:
1. Read `AGENTS.md` and only the relevant documentation.
2. Inspect the specific files involved.
3. State a brief implementation plan if the task has multiple steps.
4. Make the smallest coherent change.
5. Run relevant checks.
6. Summarize changed files, checks/results, assumptions, and the next suggested task.

## Token discipline
- Prefer targeted file reads/search over dumping directories or whole files.
- Avoid repeated summaries of settled decisions.
- Do not produce large speculative plans when a small next step is enough.
- Ask before adding dependencies or broad refactors.
- Keep implementation reports concise.
