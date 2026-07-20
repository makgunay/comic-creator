# Project State

Last updated: 2026-07-20

## Current stage

Build Week MVP implementation is underway on
`feature/comic-creator-mvp` with the approved subagent-driven workflow.

## Current focus

Begin Task 5 now that Task 4 passes deterministic verification.

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
- Task 3's deterministic OpenAI boundary is implemented and hardened: strict
  rendering and visual-input schemas, exact server-owned fact composition,
  prompt exclusions, fail-closed moderation, safe success/failure metadata,
  product-safe errors, and `.env.local`-before-`.env` loading. `npm run verify`
  passes 44/44 tests, typecheck, and production build.
- A live matched-pair smoke created `tmp/openai-smoke/hero.png` and `panel.png`
  with `gpt-image-2`. The final measured hero latency was 29,891 ms and panel
  latency was 32,335 ms. Manual inspection confirmed the panel recognizably
  retained the violet jacket, round goggles, curly hair, and silver moon-kite
  spool from the hero reference.
- The user approved a 35,000 ms panel gate based on successful continuity and
  tuned panel measurements of 31,272 and 32,335 ms. The existing matched smoke
  therefore passes: hero 29,891 ms <= 60,000 ms and panel 32,335 ms <= 35,000
  ms. No new live request was made for this decision update.
- Task 4 adds schema-valid persistence, canonical asset keys, symlink-contained
  paths, atomic replacement, one rolling backup, and corrupt-file recovery.
- The injected server factory now exposes public config plus create, load,
  update, and sample-copy routes. Strict create-input and body-parser failures
  return non-retryable product-safe client errors with no secret values.
- The tracked “Nova and the Moon Kite” sample contains four deterministic
  1024×1024 PNG panels and the four exact local dialogue overlays. The build
  script validates temporary dimensions and hashes before atomic replacement;
  invalid temporary outputs move to recovery quarantine.
- Sample copy accepts only regular contained fixture files, stages the complete
  project outside the live namespace, atomically publishes it, and quarantines
  failures without orphan assets. It leaves tracked fixtures unchanged and
  succeeds without an API key, network request, or generation-provider call.
- Injected save, backup, sample-copy, and builder failures preserve known-good
  data and leave no temporary residue in the live projects namespace.
- Task 4 focused verification passes 48/48 tests. Full `npm run verify` passes
  strict typechecking, 76/76 deterministic tests, and the production build.
  No paid or live OpenAI request was made for Task 4.

## Active decisions

- Keep the repository private during initial development.
- Use a small, model-agnostic context system with one active plan.
- Build a local-only core with sample mode; do not wire hosting or accounts.
- Preserve story authorship by limiting AI to visual-direction compilation and
  illustration.
- Use a 35-second live panel gate and present an honest drawing wait state.
- Treat same-device two-author mode as stretch work after the solo core passes.

See `DECISIONS.md` for rationale and consequences.

## Blockers and unknowns

- No Task 4 blocker remains. Live generation latency is observed, not
  guaranteed, and should remain visible during later manual QA.

## Next actions

1. Implement and review Task 5: child-facing hero, style, and story workflow.
2. Preserve the honest drawing wait state when generation UI work begins.

## Resume cue

Read the approved MVP design, implementation plan, and local SDD progress
ledger. Resume at the first task not marked complete.
