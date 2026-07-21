# Active Plan

Last updated: 2026-07-21
Status: Active

## Goal

Turn the Comic Creator concept into a working, testable, and clearly
demonstrable OpenAI Build Week submission without losing product reasoning or
building unnecessary scope.

## Current checkpoint

Checkpoint 4 — Prepare and submit.

## Checkpoints

### 0. Repository and context foundation — complete

- [x] Create and connect the GitHub repository.
- [x] Establish canonical project-context documents.
- [x] Record current hackathon and licensing constraints.
- [x] Provide a deterministic resume path for future agents.

### 1. Product definition — complete

- [x] Capture the user's complete idea without prematurely narrowing it.
- [x] Define the real user problem and primary audience.
- [x] Map the end-to-end child and parent/educator experience.
- [x] Identify the distinctive authorship and creative-control mechanism.
- [x] Define explicit MVP non-goals.
- [x] Recommend `Education` as the strongest submission category.

Acceptance: `PROJECT.md` contains an agreed problem, audience, core loop,
guardrails, non-goals, and success scenario.

### 2. Experience and technical plan — complete

- [x] Turn the core loop into screens, states, and failure paths.
- [x] Choose the smallest architecture that supports the demo.
- [x] Define provider roles, authorship invariants, and the live-risk spike.
- [x] Define test strategy, sample data, and the three-minute demo path.
- [x] Write and self-review the durable MVP design specification.
- [x] Obtain user review of the written specification.
- [x] Confirm the `Education` category.
- [x] Write and self-review the checkpointed implementation plan.

Acceptance: the user approves the written specification and a checkpointed
implementation plan exists with provider uncertainty converted into an explicit
early feasibility gate.

### 3. Build and validate the MVP — complete

- [x] Implement the complete generation, approval, overlay, Premiere, PDF, and
  filesystem-resume journey with metadata-only provider diagnostics.
- [x] Validate happy paths, recoverable failures, refusal handling, responsive
  behavior, accessibility, rendered PDFs, and clean tracked-file setup.
- [x] Revalidate no-key sample and multi-page journeys at desktop, tablet, and
  390 px widths with a clean browser console.
- [x] Accept D-010's 40-second observed panel target after all six Task 8
  samples completed within it.

Functional and latency acceptance pass: a judge can run the project and
reproduce the sample demo, and the revised 40-second observed panel target
passes. Planned implementation and deterministic correction work is complete;
Checkpoint 3 is closed.

### 3.1. Panel-workshop feedback polish — complete

- [x] Vertically center short overlay text and fit longer dialogue without
  hiding authored words.
- [x] Let children remove and drag dialogue and caption boxes while preserving
  normalized, in-bounds geometry through save, Premiere, and PDF.
- [x] Replace the free-form camera field with simple child-facing choices that
  compile to GPT Image 2 framing and viewpoint language.
- [x] Add an opt-in GPT Image 2 lettering experiment that uses exact authored
  overlay copy, marks the resulting image version, and never double-renders
  local text.
- [x] Add malformed-input, interaction, prompt, persistence, Premiere, and PDF
  coverage, then verify the live browser at desktop and mobile widths.

Acceptance: local lettering is easier to edit and place, camera direction is
understandable without photography knowledge, and experimental embedded
lettering can be tried without losing the exact local source text or confusing
it with the default exact-overlay workflow.

### 3.2. Uncropped browser panels — complete

- [x] Resize the panel workshop art frame to the square source image instead of
  cropping the image into a landscape box.
- [x] Preserve the complete square artwork in Premiere so approval and final
  presentation show the same composition.
- [x] Remove obsolete landscape-safe lettering-coordinate translation.
- [x] Add regression coverage and verify the saved project at desktop and
  mobile widths.

Acceptance: approved square panel art is fully visible without cropping in the
workshop and Premiere, and authored overlay geometry uses the same normalized
coordinate system on screen, in generated lettering, and in the PDF.

### 3.3. Guided creative studio — complete

- [x] Replace the blank-page hero description with a structured, editable hero
  recipe that preserves a freeform path and compiles only child-authored facts.
- [x] Add simple style mood controls that refine the selected preset without
  exposing model-facing prompt language.
- [x] Add an on-demand AI Story Coach that classifies one missing narrative
  element and maps it to a fixed neutral question; it must never invent or
  rewrite plot, dialogue, captions, characters, or endings.
- [x] Introduce artifact-based progress and same-device pass-the-pen authorship
  without points, streaks, leaderboards, accounts, or public sharing.
- [x] Make panel direction progressive: scene first, then words, then drawing,
  with revision and advanced lettering controls revealed when relevant.
- [x] Turn Premiere into a reliable celebratory presentation with complete
  artwork, title/byline credit, page navigation, presentation mode, and PDF.
- [x] Preserve the no-photo boundary and minimize coach requests to necessary
  story text only, with moderation and no conversational transcript.
- [x] Add deterministic malformed-output, authorship-invariant, persistence,
  interaction, responsive, and accessibility coverage.

Acceptance: a first-time child can create with progressively revealed guidance,
ask an optional coach for one neutral question without surrendering authorship,
share control with a same-device partner, direct and approve artwork, and reach
a celebratory readable Premiere at desktop and mobile widths.

### 4. Prepare and submit — pending

- [x] Finalize README and third-party notices.
- [x] Record how Codex and GPT-5.6 contributed.
- [ ] Publish the repository with Apache-2.0 source licensing and an explicit
  all-rights-reserved carve-out for original sample artwork and branding.
- [ ] Capture the primary `/feedback` session ID.
- [ ] Record and verify the public YouTube demo.
- [ ] Complete every required Devpost field and submit before the deadline.

Acceptance: Devpost reports the project as submitted, not draft, and all links
and access paths have been checked independently.

## Guardrails for the current checkpoint

- Treat official Devpost requirements as authoritative over summaries.
- Keep deterministic verification, live-app proof, and external submission
  completion as separate claims.
- Do not push, publish, grant access, upload media, or submit Devpost without
  explicit user authorization.
- Preserve the local-first application boundary. Publish repository visibility
  only with the accepted license scope and verified secret-history evidence.
