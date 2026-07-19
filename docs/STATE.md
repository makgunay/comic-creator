# Project State

Last updated: 2026-07-20

## Current stage

Build Week MVP design and written specification approved. The checkpointed
implementation plan is written and self-reviewed; application code has not
started.

## Current focus

Choose the implementation-plan execution workflow.

## Verified facts

- The Devpost project `Comic Creator` exists as a draft for OpenAI Build Week.
- The GitHub repository is `makgunay/comic-creator`.
- The repository is private and its default branch is `main`.
- The repository has been initialized and connected to `origin`.
- The approved design is a local responsive web app with a local TypeScript/Node
  server and local filesystem persistence.
- GPT-5.6 Luna is the constrained visual-direction compiler; GPT Image 2 is the
  reference-guided artwork model. Both sit behind adapters.
- The minimum finished comic is four child-authored panels, paginated four per
  page and exportable as PDF.
- Dialogue and captions are exact local overlays, not image-model text.
- The final submission category is `Education`.
- The implementation plan is
  `docs/superpowers/plans/2026-07-20-comic-creator-mvp.md`.
- No open-source license has been added.
- The official submission deadline is 2026-07-21 at 5:00 PM Pacific Time.

## Active decisions

- Keep the repository private during initial development.
- Use a small, model-agnostic context system with one active plan.
- Build a local-only core with sample mode; do not wire hosting or accounts.
- Preserve story authorship by limiting AI to visual-direction compilation and
  illustration.
- Treat same-device two-author mode as stretch work after the solo core passes.

See `DECISIONS.md` for rationale and consequences.

## Blockers and unknowns

- The reference-guided hero workflow must be proven against live model latency
  and consistency before the full generation UI is built.
- No application code or deterministic test harness exists yet.

## Next actions

1. Ask the user to choose the plan-execution workflow.
2. Execute the plan task-by-task with its test and commit checkpoints.
3. Prove the live hero-reference and panel-generation path before the full UI.
4. Build and verify the solo core before considering two-author stretch work.

## Resume cue

Read the approved MVP design and implementation plan. Resume from the user's
execution-workflow choice; do not restart product definition.
