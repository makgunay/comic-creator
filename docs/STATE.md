# Project State

Last updated: 2026-07-21

## Current stage

The Build Week solo MVP and final deterministic corrections are complete on
`feature/comic-creator-mvp`. Checkpoint 3 is closed: functional proof and the
revised live latency acceptance gate pass.

## Current focus

Prepare the external Build Week submission materials and complete Checkpoint 4.

## Verified facts

- Implemented: local React/Express app, filesystem persistence, sample mode,
  exact overlays, constrained OpenAI generation, explicit version approval,
  opaque-URL project resume, up to 16 panels, four-per-page Premiere, and PDF
  export.
- Deterministic proof: `npm run verify` covers the shared domain, storage,
  provider contracts/errors, server routes, client lifecycle behavior, the
  mocked full journey, multi-page pagination, and PDF rendering. The final
  correction count is 34 files and 225 tests.
- Hero generation now follows the approved authorship boundary: strict visual
  facts are moderated, compiled to validated rendering choices, and converted
  to an art-only prompt before image generation. OpenAI completion and failure
  diagnostics identify the exact configured model while remaining
  metadata-only.
- Local boundary proof rejects hostile Host/Origin and cross-site browser
  requests before API routes, requires JSON for writes, preserves safe `413`
  responses, and keeps route identifiers and image membership contained.
- Startup recovery converts persisted interrupted drawing work to
  `failed-retryable` before listening and leaves already recovered projects
  byte-for-byte untouched on another recovery pass.
- Live OpenAI proof: `gpt-5.6-luna` plus `gpt-image-2` completed one approved
  hero, four approved panels, and one non-destructive redirection. Eight paid
  image requests total included the two-call smoke. Exact dialogue stayed local.
- D-010 supersedes D-007 with the accepted 40-second observed panel target. The
  six Task 8 panel image calls measured 26.049, 27.737, 28.654, 35.641, 36.151, and 38.477
  seconds (mean 32.118 seconds, median 32.148 seconds, maximum 38.477 seconds).
  Three exceeded the original 35-second value; none exceeded 40 seconds. No
  retry was made to improve the numbers.
- Manual browser proof covered desktop, tablet, mobile, keyboard
  traversal, visible focus, labels, target size, reduced motion, effective 200%
  reflow, sample persistence, safe export failure, and zero normal-path console
  errors. The distinct final no-key add-panel journey also passed in the in-app
  browser at 1440, 1024, and 390 pixel widths: a panel was inserted into the
  Problem beat, edited, saved, recovered after reload, navigated as panel 3 of
  5, and rendered by Premiere as page 1 of 2 plus page 2 of 2. The three widths
  had no horizontal overflow; the add-panel control was 44 pixels high, and no
  sampled mobile Panel or Premiere control was smaller than 40 pixels. The
  browser reported no warnings or errors. Generation remained disabled and no
  paid request was made.
- A separate deterministic-provider browser pass verified the generation
  states that the no-key sample cannot exercise. At 1024 pixels, the loading
  state locked editing and navigation while keeping the approved panel and
  words visible; safety refusal and retryable provider failure each restored
  re-draw controls, retained the child's direction, and kept approved artwork
  intact. The refusal state also passed at 390 pixels. Measured desktop and
  mobile refusal states had no horizontal overflow, the console had no
  warnings or errors, and no OpenAI request was made.
- Manual PDF proof: live and no-key PDFs rendered as clean, unencrypted,
  one-page US Letter documents with exact extracted overlays and no clipping,
  overlap, distortion, or broken glyph.
- Clean tracked-files setup passed on Node 26: production-only install loaded
  Sharp and the pinned TypeScript launcher; the production server recovered an
  interrupted project before listening. A separate clean checkout passed
  `npm ci && npm run verify`.
- The Devpost project remains a draft; `makgunay/comic-creator` is private and
  has no open-source license. The category is `Education`; the deadline is
  2026-07-21 at 5:00 PM Pacific Time.

## Active decisions

- Keep the repository private during initial development.
- Use a small, model-agnostic context system with one active plan.
- Build a local-only core with sample mode; do not wire hosting or accounts.
- Preserve story authorship by limiting AI to visual-direction compilation and
  illustration.
- D-010 supersedes D-007 with a 40-second observed live panel target and an
  honest drawing wait state; generation timing is observed, not guaranteed.
- Use the accepted four-card wide story layout with two tablet columns and one
  mobile column; this is not a domain panel cap.
- Treat same-device two-author mode as stretch work after the solo core passes.

See `DECISIONS.md` for rationale and consequences.

## Blockers and unknowns

- No implementation blocker remains. Submission media, access, fields, and
  Devpost submission are still incomplete external work.

## Next actions

1. Record the public demo and capture the primary `/feedback` session ID.
2. Grant required private-repository access and finish the Devpost submission.

## Resume cue

Read `README.md`, this state, the active plan, and the Task 8 SDD report. Resume
with the first incomplete submission action; two-author stretch is unstarted.
