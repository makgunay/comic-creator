# Decision Log

This file is append-only. Do not rewrite history when a choice changes. Add a
new entry that explicitly supersedes the earlier decision.

## D-001 — Keep the source repository private during initial development

- Date: 2026-07-19
- Status: Accepted
- Context: The hackathon permits a private repository when judging access is
  granted, and the product and commercialization path are still being defined.
- Decision: Keep `makgunay/comic-creator` private and add no open-source license
  yet.
- Rationale: This satisfies the current build workflow while preserving the
  option to choose a license deliberately later.
- Consequence: Before submission, grant access to `testing@devpost.com` and
  `build-week-event@openai.com`. Publishing requires a new license decision.

## D-002 — Use a minimal canonical context system

- Date: 2026-07-19
- Status: Accepted
- Context: Decisions, state, and plans must survive irregular re-entry without
  producing a maze of status files or depending on one agent product.
- Decision: Use `PROJECT.md`, `RULES.md`, `STATE.md`, `PLAN.md`, and
  `DECISIONS.md`, with `AGENTS.md` as the entrypoint.
- Rationale: Each kind of information has one owner, and an agent can resume by
  reading two short live files before loading deeper context.
- Consequence: Maintain one active plan, use Git as the activity log, and add no
  session transcripts or new context file types without a demonstrated need.
