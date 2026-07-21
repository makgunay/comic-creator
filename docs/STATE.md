# Project State

Last updated: 2026-07-21

## Current stage

The Build Week MVP and feedback passes are complete on
`feature/comic-creator-mvp`; only Checkpoint 4 submission preparation remains.

## Current focus

Prepare the verified local project for its external submission steps.

## Verified facts

- Implemented: local React/Express app, filesystem persistence, sample mode,
  exact overlays, constrained OpenAI generation, explicit version approval,
  opaque-URL project resume, up to 16 panels, four-per-page Premiere, and PDF
  export.
- Deterministic proof: `npm run verify` covers the shared domain, storage,
  provider contracts/errors, server routes, client lifecycle behavior, the
  mocked full journey, multi-page pagination, PDF rendering, AI-coach
  invariants, guided-recipe persistence, same-device collaboration, and
  responsive behavior. The current verification count is 37 test files and
  266 tests; strict typechecking and the production Vite build also pass.
- Guided-studio proof: new projects can use an editable hero recipe or
  freeform description, add up to two child-facing style moods, and follow the
  four-beat story spine. Same-device pass-the-pen credits two local authors
  without accounts, and progress celebrates completed artifacts rather than
  points or streaks.
- AI-coach proof: the optional server route moderates and sends only the four
  beat fields to `gpt-5.6-luna`, validates one constrained missing-element
  signal, and lets the client display one fixed neutral question. It stores no
  transcript and cannot return plot, characters, dialogue, captions, or prose.
- Progressive-workshop proof: scene, words, and draw/choose controls are
  sequenced clearly; revision and experimental lettering stay contextual.
  Premiere preserves complete square art, local coauthor credit, pagination,
  presentation mode, reflection, and approved-only PDF export.
- Panel-feedback proof: word boxes fit, move, and remove at 390 px; camera
  choices are child-facing; and the opt-in lettering experiment retains the
  exact editable source while suppressing duplicate local rendering. Workshop,
  Premiere, and PDF share the complete square art frame and coordinates.
- Hero generation now follows the approved authorship boundary: strict visual
  facts are moderated, compiled to validated rendering choices, and converted
  to an art-only prompt before image generation. OpenAI completion and failure
  diagnostics identify the exact configured model while remaining
  metadata-only.
- Local boundary proof rejects hostile Host/Origin and cross-site requests,
  requires JSON writes, preserves safe `413` responses, and contains route and
  image identifiers. Startup recovery is safe and idempotent.
- Live OpenAI proof: `gpt-5.6-luna` plus `gpt-image-2` completed one hero, four
  panels, one redirection, and the lettering candidate. D-010 records the six
  observed panel calls (26.049–38.477 seconds); none exceeded 40 seconds.
- Manual browser proof covers desktop/tablet/mobile reflow, keyboard and focus,
  target sizing, sample persistence, the five-panel add/reload/Premiere journey,
  the guided Story Coach, progressive Panels, and presentation mode. The final
  desktop and 390 px audits had no horizontal overflow or console errors, and
  all approved images loaded at their complete square dimensions.
- Deterministic failure proof preserves approved art and authored words through
  loading, safety refusal, retry, and startup recovery without paid requests.
- Live and no-key PDFs are clean US Letter documents with exact overlays and no
  clipping, overlap, distortion, or broken glyph.
- Clean Node 26 setup, production-only dependencies, startup recovery, and a
  separate `npm ci && npm run verify` checkout passed.
- The Devpost project remains a draft. `makgunay/comic-creator` is public with
  Apache-2.0 licensing for source code and documentation, while original sample
  artwork and project identity remain reserved. Draft PR #1 carries the full
  MVP into `main`. The category is `Education`; the deadline is 2026-07-21 at
  5:00 PM Pacific Time.

## Active decisions

- Publish the repository under Apache-2.0 with the accepted non-code asset
  carve-out; this supersedes the initial private-development decision.
- Use a small, model-agnostic context system with one active plan.
- Build a local-only core with sample mode; do not wire hosting or accounts.
- Preserve story authorship by limiting AI to visual-direction compilation and
  illustration.
- D-010 supersedes D-007 with a 40-second observed live panel target and an
  honest drawing wait state; generation timing is observed, not guaranteed.
- D-012 supersedes D-009 for browser panels: show complete square artwork in
  the workshop, Premiere, and PDF without cover cropping.
- Use the accepted four-card wide story layout with two tablet columns and one
  mobile column; this is not a domain panel cap.
- Keep same-device two-author mode local, account-free, and non-social.

See `DECISIONS.md` for rationale and consequences.

## Blockers and unknowns

- No known implementation blocker remains. Submission media, access, fields,
  and Devpost submission remain incomplete external work.

## Next actions

1. Record the public demo and capture the primary `/feedback` session ID.
2. Complete and independently verify every Devpost field, then submit.

## Resume cue

Read `README.md`, this state, and the active plan; resume the first incomplete
Checkpoint 4 action only with the user's authorization for external changes.
