# Project State

Last updated: 2026-07-20

## Current stage

Build Week MVP implementation is underway on
`feature/comic-creator-mvp` with the approved subagent-driven workflow.

## Current focus

Begin Task 6 now that Task 5 passes deterministic and visual verification.

## Verified facts

- The Devpost project exists as a draft; `makgunay/comic-creator` is private,
  initialized, connected to `origin`, and uses `main` as its default branch.
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
- Tasks 1–2 provide a verified React/Vite and Express shell plus a browser-safe
  domain for beats, panels, asset keys, pagination, and immutable approval.
- Task 3's deterministic OpenAI boundary is implemented and hardened: strict
  rendering and visual-input schemas, exact server-owned fact composition,
  prompt exclusions, fail-closed moderation, safe success/failure metadata,
  product-safe errors, and `.env.local`-before-`.env` loading. `npm run verify`
  passes 44/44 tests, typecheck, and production build.
- A live `gpt-image-2` matched pair measured 29,891 ms for the hero and 32,335
  ms for the panel while retaining the violet jacket, goggles, curly hair, and
  moon-kite spool. The approved panel gate is 35,000 ms; no new live request was
  made for that decision.
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
- Autosave uses a 500 ms debounce, stable pagehide listener, confirmed-only
  `Saved`, monotonic revisions and save attempts, and project-context guards;
  stale same-revision completions cannot replace newer save outcomes.
- Style presets seed baseline and editable notes; edits change only `editedNotes`
  and Reset restores baseline. Story has exactly four child-authored beat cards
  without imposing a four-panel domain cap.
- Configuration has explicit loading, enabled, disabled, and error states with
  request-identity and unmount guards. Launch requests have the same lifecycle
  protection, including React Strict Mode effect replay.
- Drawing remains disabled until Task 6 even with enabled configuration and a
  completed description. Error notices are alerts; informational notices are
  polite statuses; step navigation focuses the new screen heading.
- Browser fallback QA verified four/two/one story columns at 1440, 900, and
  390 px, visible desktop actions at 1440×900, and no 390×844 overflow.
- Task 5 correction verification passes typecheck, 110/110 deterministic tests,
  and production build without a live or paid OpenAI request.

## Active decisions

- Keep the repository private during initial development.
- Use a small, model-agnostic context system with one active plan.
- Build a local-only core with sample mode; do not wire hosting or accounts.
- Preserve story authorship by limiting AI to visual-direction compilation and
  illustration.
- Use a 35-second live panel gate and present an honest drawing wait state.
- Use the accepted four-card wide story layout with two tablet columns and one
  mobile column; this is not a domain panel cap.
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
