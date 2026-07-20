# Project State

Last updated: 2026-07-20

## Current stage

Build Week MVP implementation is underway on
`feature/comic-creator-mvp` with the approved subagent-driven workflow.

## Current focus

Begin Task 6 now that Task 5 passes deterministic and visual verification.

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
- The implementation plan is `docs/superpowers/plans/2026-07-20-comic-creator-mvp.md`.
- The user chose subagent-driven execution: one fresh implementer per task,
  followed by task-scoped specification and quality review.
- Approved desktop and mobile references guide browser-fidelity verification.
- No open-source license has been added.
- The official submission deadline is 2026-07-21 at 5:00 PM Pacific Time.
- Task 1's React/Vite client, Express server, and health test pass verification.
- Task 2's browser-safe domain validates beats, panels, asset keys, pagination,
  and immutable candidate approval; focused and full verification pass.
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
- Task 4 provides contained persistence, paired rollback, recovery quarantine,
  public config, project CRUD, and an atomic sample copy that leaves fixtures
  unchanged. Its four 1024×1024 PNGs and exact dialogue are validated.
- Task 4 full verification passed strict typechecking, 78/78 deterministic tests,
  and the production build without a paid or live OpenAI request.
- Task 5 implements child-facing launch, hero, style, and story. Launch exposes
  exactly `Start a new comic` and `Explore the sample`; optional author credit
  remains local project data.
- The typed browser API validates responses, normalizes malformed/network errors,
  and rejects schema-shaped messages that resemble credentials.
- Autosave uses functional transitions, a 500 ms debounce, latest-edit pagehide
  flush, confirmed-only `Saved`, monotonic revisions, and abort/context guards;
  stale loads, timers, or save responses cannot replace newer child work.
- Style presets seed baseline and editable notes; edits change only `editedNotes`
  and Reset restores baseline. Story has exactly four child-authored beat cards
  without imposing a four-panel domain cap.
- Task 5 focused client verification passes 21/21 tests. Full `npm run verify`
  passes typecheck, 99/99 tests, and build without a live or paid OpenAI request.
- Browser fallback QA at 1440×900 and 390×844 verified new/sample navigation,
  16 px text, 44 px targets, no overflow, and no console errors. Accepted and
  rendered PNGs were inspected directly. Disabled-generation notice behavior is
  deterministic-test proof, not a separately forced browser configuration check.

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

- No Task 5 blocker remains. Live generation latency is observed, not
  guaranteed, and should remain visible during later manual QA.

## Next actions

1. Implement and review Task 6: panel generation, exact overlays, and explicit
   image-version approval.
2. Preserve the honest drawing wait state and never replace approved artwork
   automatically.

## Resume cue

Read the approved MVP design, implementation plan, and local SDD progress
ledger. Resume at the first task not marked complete.
