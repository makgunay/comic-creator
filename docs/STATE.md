# Project State

Last updated: 2026-07-21

## Current stage

The Build Week solo MVP and final deterministic corrections are complete on
`feature/comic-creator-mvp`. Functional proof passes, but the live latency
acceptance gate is not passed.

## Current focus

Complete the final no-key add-panel browser revalidation after permission to
open a fresh Chrome window, then ask the user whether to retain or revise D-007
before treating Checkpoint 3 as complete.

## Verified facts

- Implemented: local React/Express app, filesystem persistence, sample mode,
  exact overlays, constrained OpenAI generation, explicit version approval,
  opaque-URL project resume, up to 16 panels, four-per-page Premiere, and PDF
  export.
- Deterministic proof: `npm run verify` covers the shared domain, storage,
  provider contracts/errors, server routes, client lifecycle behavior, the
  mocked full journey, multi-page pagination, and PDF rendering. The final
  correction count is 34 files and 224 tests.
- Local boundary proof rejects hostile Host/Origin and cross-site browser
  requests before API routes, requires JSON for writes, preserves safe `413`
  responses, and keeps route identifiers and image membership contained.
- Startup recovery converts persisted interrupted drawing work to
  `failed-retryable` before listening and leaves already recovered projects
  byte-for-byte untouched on another recovery pass.
- Live OpenAI proof: `gpt-5.6-luna` plus `gpt-image-2` completed one approved
  hero, four approved panels, and one non-destructive redirection. Eight paid
  image requests total included the two-call smoke. Exact dialogue stayed local.
- D-007 remains the accepted 35-second observed panel target. Current variance
  is material: three Task 8 panel image calls exceeded it, while three completed
  under it. No retry was made to improve the numbers.
- Earlier manual browser proof covered desktop, tablet, mobile, keyboard
  traversal, visible focus, labels, target size, reduced motion, effective 200%
  reflow, sample persistence, safe export failure, and zero normal-path console
  errors. The distinct final no-key add-panel journey still needs revalidation
  at 1440, 1024, and 390 pixel widths. IAB and Chrome extension bindings were
  unavailable; permission to open a fresh Chrome window is pending.
- Manual PDF proof: live and no-key PDFs rendered as clean, unencrypted,
  one-page US Letter documents with exact extracted overlays and no clipping,
  overlap, distortion, or broken glyph.
- Clean tracked-files setup passed on Node 26: production-only install loaded
  Sharp and the pinned TypeScript launcher; the production server recovered an
  interrupted project before listening. A separate clean checkout passed
  `npm ci && npm run verify`.
- Checkpoint 3 has exactly two open gates: final no-key add-panel browser
  revalidation at 1440, 1024, and 390 pixel widths, and the user decision to
  retain or revise D-007.
- The Devpost project remains a draft; `makgunay/comic-creator` is private and
  has no open-source license. The category is `Education`; the deadline is
  2026-07-21 at 5:00 PM Pacific Time.

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

- Final no-key add-panel browser revalidation is blocked pending permission to
  open a fresh Chrome window after both IAB and Chrome extension bindings were
  unavailable. Earlier completed broad visual QA remains valid.
- Live latency acceptance is partial, not passed: three of six Task 8 panel
  image samples exceeded D-007. The user must retain or revise that decision
  before Checkpoint 3 can close.
- This is not an implementation blocker. Submission media, access, and fields
  are still incomplete external work.

## Next actions

1. After permission, open a fresh Chrome window and revalidate the no-key
   add-panel journey at 1440, 1024, and 390 pixel widths.
2. Ask the user to retain or revise D-007 based on the live variance.
3. Record the public demo and capture the primary `/feedback` session ID.
4. Grant required private-repository access and finish the Devpost submission.

## Resume cue

Read `README.md`, this state, the active plan, and the Task 8 SDD report. Resume
with the first incomplete submission action; two-author stretch is unstarted.
