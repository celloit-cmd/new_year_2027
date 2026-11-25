# Project Instructions

You are working on a personal New Year 2027 interactive website for two friends.

## First: read only what you need
- `docs/PROJECT_BRIEF.md` — product scope and experience structure.
- `docs/CREATIVE_DIRECTION.md` — visual and storytelling direction.
- `docs/ARCHITECTURE.md` — implementation boundaries and suggested structure.
- `docs/DEVELOPMENT_WORKFLOW.md` — how to work efficiently.
- `docs/SKILLS.md` — selective skill usage and token-efficient loading.
- `docs/DECISIONS.md` — settled decisions and unresolved questions.

Do not reread every document for every task. Start with this file, then open only the relevant section/document.

## Core working rules
1. Inspect the existing repository before changing anything. Preserve working code and conventions.
2. Do not implement speculative features or invent personal memories/content. Use clearly marked placeholders where content is not supplied.
3. Build incrementally. Make the smallest coherent change that completes the current task.
4. Prefer simple, maintainable solutions over unnecessary abstractions, dependencies, or elaborate architecture.
5. Reuse components and animation systems across both personalized experiences; keep each person's content/configuration separate.
6. Keep the experience responsive, accessible, and performant. Respect `prefers-reduced-motion`.
7. Avoid unnecessary dependencies. Do not add Lenis, audio, a backend, a database, or extra animation libraries unless a concrete requirement justifies them.
8. Do not add large cinematic effects to Page 2. Its purpose is to let the personal message breathe.
9. Keep secrets and personal codes out of public source control if they are intended to provide real privacy. Client-side codes are not secure authentication.
10. Before finishing, run the relevant checks (typecheck, lint, tests, build if available) and report exactly what was run and any failures.

## Token-efficient agent behaviour
- Do not dump entire files or the whole repository into context.
- Use targeted searches and inspect only files relevant to the task.
- Summarize findings briefly; avoid repeating the project brief.
- Do not regenerate documentation unless a decision changes.
- Ask one concise question only when a blocking requirement is genuinely unknown. Otherwise make a conservative assumption and state it.
- Do not start the next milestone automatically. Finish the requested task and summarize changed files, checks, and next step.
- If the user asks for a plan, provide a short plan before editing. If the user asks to implement, implement directly.

## Definition of done
A task is complete when the requested behaviour works, existing behaviour is preserved, responsive/reduced-motion considerations are handled where relevant, and available checks pass.
