# Project State

Last updated: 2026-07-20

## Current stage

Build Week MVP implementation is underway on
`feature/comic-creator-mvp` with the approved subagent-driven workflow.

## Current focus

Review Task 7 now that its Premiere and PDF implementation passes deterministic,
browser, and rendered-document verification.

## Verified facts

- The Devpost project is a draft; `makgunay/comic-creator` is private on `main`.
  No open-source license has been added.
- The approved design is a local React/TypeScript app with an Express server,
  filesystem persistence, sample mode, and no hosting or accounts.
- GPT-5.6 Luna compiles constrained visual direction; GPT Image 2 creates
  reference-guided artwork. Dialogue and captions remain exact local overlays.
- The minimum comic is four child-authored panels, four per page, with PDF
  export. The submission category is `Education`; the deadline is 2026-07-21
  at 5:00 PM Pacific Time.
- The active implementation plan is
  `docs/superpowers/plans/2026-07-20-comic-creator-mvp.md`; execution uses one
  fresh implementer and task-scoped review with accepted visual references.
- Tasks 1–2 provide a verified React/Vite and Express shell plus a browser-safe
  domain for beats, panels, asset keys, pagination, and immutable approval.
- Task 3 provides strict OpenAI adapters, server-owned visual facts, prompt
  exclusions, fail-closed moderation, product-safe errors, and deterministic
  configuration loading.
- A live `gpt-image-2` matched pair measured 29,891 ms for the hero and 32,335
  ms for the panel with character continuity. The approved panel gate is 35,000
  ms; no new live request was made for that decision.
- Task 4 provides contained transactional persistence, recovery quarantine,
  public config, project CRUD, and an atomic writable sample copy with four
  validated 1024×1024 PNGs and exact dialogue.
- Task 5 implements the verified child-facing launch, hero, style, and story
  workflow with confirmed-only autosave and lifecycle-safe client requests.
- Task 6 implements hero and panel generation behind strict server routes,
  explicit candidate approval or dismissal, exact local dialogue/caption
  overlays, and a responsive panel-directing workshop.
- Project writes use queued atomic mutation. Generated square PNGs are contained,
  staged, atomically published, and quarantined on mutation failure; completion
  merges onto the latest revision without replacing approved art or exact text.
- Explicit approval preserves all versions; hero replacement affects future
  generation only. Client responses are guarded by request, project, API, and
  mount identity. The no-key image route validates membership, paths, containment,
  regular files, and PNG shape.
- Task 7 provides a read-only Premiere with ordered four-panel pages, title,
  author credit, exact overlays, approved-only artwork, honest missing-art
  placeholders, and a progressively enhanced local PDF download that retains a
  normal `href` and `download` fallback.
- PDF export validates every approved project member through the contained asset
  resolver, uses one inset art box for both square artwork and normalized text
  geometry, preserves authored ASCII spacing in drawing and extraction, and
  fails with safe recoverable JSON instead of returning a partial document when
  approval, assets, glyphs, or legible text fit are invalid.
- Task 7 deterministic verification passes typecheck, 184/184 tests, production
  build, and diff check. It includes two-page panels 5–8, candidate exclusion,
  repeated-space preservation, curly-apostrophe preservation, unsupported-glyph
  rejection, asset-failure classification, validated browser downloads, and
  request/project/API/mount lifecycle guards without a live or paid OpenAI request.
- The in-app browser runtime exposed no available browser, so manual fallback QA
  used system Chrome. At 1440x900 and 1024x768 the Premiere matches the accepted
  landscape 2x2 composition; at 390x844 it becomes a coherent one-column comic.
  All three widths had no horizontal overflow, and the preview had no textareas.
- A no-key sample download rendered cleanly as one US Letter page with Poppler.
  A correction proof preserved leading, repeated, and trailing ASCII spaces in
  raw extraction where line wrapping permits representation. Chrome also showed
  the recoverable asset-error notice without creating a file, then completed a
  restored successful download. A separate eight-panel document rendered panels
  5–8 cleanly on page 2 of 2.

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

- No Task 7 blocker remains. Live generation was intentionally not exercised;
  the honest wait state and provider behavior still need end-to-end release QA.

## Next actions

1. Complete task-scoped specification and quality review for Task 7.
2. Implement Task 8: close the journey, judge instructions, and final proof.

## Resume cue

Read the approved MVP design, implementation plan, and local SDD progress
ledger. Resume at the first task not marked complete.
