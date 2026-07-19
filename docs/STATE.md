# Project State

Last updated: 2026-07-20

## Current stage

Build Week MVP design approved in conversation. Written specification committed
for user review; implementation has not started.

## Current focus

Obtain user approval of the written specification, then produce a checkpointed
implementation plan.

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
- `Education` is the recommended category but is not yet a locked submission
  decision.
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

- The written specification still requires explicit user review.
- The user must confirm or revise the recommended `Education` category during
  that review.
- The reference-guided hero workflow must be proven against live model latency
  and consistency before the full generation UI is built.
- No application code or deterministic test harness exists yet.

## Next actions

1. Ask the user to review the committed MVP design specification.
2. After approval, write the implementation plan.
3. Prove the live hero-reference and panel-generation path early.
4. Build and verify the solo core before considering two-author stretch work.

## Resume cue

Read the approved MVP design, confirm whether the user has reviewed it, and do
not start implementation before the implementation plan is approved.
