# Project State

Last updated: 2026-07-20

## Current stage

Build Week MVP implementation is underway on
`feature/comic-creator-mvp` with the approved subagent-driven workflow.

## Current focus

Resolve Task 3's live panel-latency gate before starting Task 4.

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
- The user chose subagent-driven execution: one fresh implementer per task,
  followed by task-scoped specification and quality review.
- Desktop and mobile visual references have been generated from the approved
  product design for later browser-fidelity verification.
- No open-source license has been added.
- The official submission deadline is 2026-07-21 at 5:00 PM Pacific Time.
- Task 1 established the local TypeScript application foundation: a React/Vite
  client, Express server, and deterministic health test all pass verification.
- Task 2 established the browser-safe, schema-validated shared project domain:
  four beats and panels, relative image asset keys, derived pagination, and
  immutable candidate-image approval transitions. Focused domain tests, strict
  typechecking, and full verification pass.
- Task 3's deterministic OpenAI boundary is implemented and verified: strict
  rendering-only enums, exact server-owned visual-fact composition, prompt
  exclusions, injected-client request tests, safe metadata logging, product-safe
  errors, and `.env.local`-before-`.env` loading. Focused tests pass 15/15;
  `npm run verify` passes 38/38 tests, typecheck, and production build.
- A live matched-pair smoke created `tmp/openai-smoke/hero.png` and `panel.png`
  with `gpt-image-2`. The final measured hero latency was 29,891 ms and panel
  latency was 32,335 ms. Manual inspection confirmed the panel recognizably
  retained the violet jacket, round goggles, curly hair, and silver moon-kite
  spool from the hero reference.

## Active decisions

- Keep the repository private during initial development.
- Use a small, model-agnostic context system with one active plan.
- Build a local-only core with sample mode; do not wire hosting or accounts.
- Preserve story authorship by limiting AI to visual-direction compilation and
  illustration.
- Treat same-device two-author mode as stretch work after the solo core passes.

See `DECISIONS.md` for rationale and consequences.

## Blockers and unknowns

- Task 3 is a no-go on latency: recognizable reference continuity passes, hero
  latency passes the 60,000 ms limit, but panel latency misses the 30,000 ms
  limit by 2,335 ms after supported request and reference-size tuning.
- Task 4 must not begin until the panel-latency gate is resolved or explicitly
  reconsidered.

## Next actions

1. Review Task 3's deterministic implementation and live evidence.
2. Decide whether to continue latency investigation or explicitly reconsider
   the 30,000 ms panel gate based on the observed 31–32 second tuned results.
3. Keep Task 4 blocked until that decision is recorded.

## Resume cue

Read the approved MVP design, implementation plan, and local SDD progress
ledger. Resume at the first task not marked complete.
