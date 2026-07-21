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

- [x] Close the final specification gaps in hero visual compilation and
  metadata-only provider model diagnostics.
- [x] Complete Task 6 generation, approval, exact-overlay, and panel-workshop scope.
- [x] Complete Task 7 read-only Premiere, pagination, approved-only PDF export,
  guarded progressive download UX, deterministic tests, responsive browser QA,
  recoverable-failure proof, and rendered-PDF inspection.
- [x] Pass task-scoped Task 7 specification and quality review.
- [x] Implement the complete core journey.
- [x] Validate the deterministic and functional happy path and important
  failure states.
- [x] Test setup from tracked files with Node 26, including production-only
  Sharp installation and the full deterministic verification command.
- [x] Perform manual product, accessibility, PDF, and visual QA.
- [x] Keep README, notices, and project state aligned with verified behavior.
- [x] Revalidate the final no-key add-panel journey at 1440, 1024, and 390
  pixel widths in the in-app browser, including saved-project reload, panel
  direction, five-panel navigation, and Premiere page 2.
- [x] Verify loading, safety-refusal, and retryable-failure states with a
  deterministic local provider, including preservation of approved artwork,
  recovered retry controls, retained direction, responsive refusal layout,
  and a clean browser console.
- [x] Resolve D-007 acceptance with the user through D-010: the target is
  revised to 40 seconds after Task 8 measured 26.049, 27.737, 28.654, 35.641,
  36.151, and 38.477 seconds; none of the six observed panel samples exceeded
  40 seconds.

Functional and latency acceptance pass: a judge can run the project and
reproduce the sample demo, and the revised 40-second observed panel target
passes. Planned implementation and deterministic correction work is complete;
Checkpoint 3 is closed.

### 4. Prepare and submit — pending

- [x] Finalize README and third-party notices.
- [x] Record how Codex and GPT-5.6 contributed.
- [ ] Capture the primary `/feedback` session ID.
- [ ] Record and verify the public YouTube demo.
- [ ] Grant private repository access to the required judging accounts.
- [ ] Complete every required Devpost field and submit before the deadline.

Acceptance: Devpost reports the project as submitted, not draft, and all links
and access paths have been checked independently.

## Guardrails for the current checkpoint

- Execute each implementation task with a fresh implementer, TDD evidence, and
  task-scoped specification and quality review before the next task.
- Validate live reference-image consistency and latency before building the
  full generation workflow.
- Do not expand the documentation system unless a concrete retrieval failure
  demonstrates the need.
- Keep the demoable core journey ahead of secondary features.
