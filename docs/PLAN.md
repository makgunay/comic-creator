# Active Plan

Last updated: 2026-07-20
Status: Active

## Goal

Turn the Comic Creator concept into a working, testable, and clearly
demonstrable OpenAI Build Week submission without losing product reasoning or
building unnecessary scope.

## Current checkpoint

Checkpoint 3 — Build and validate the MVP with subagent-driven development.

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

### 3. Build and validate the MVP — active

- [ ] Implement the complete core journey.
- [ ] Validate happy path and important failure states.
- [ ] Test setup from a clean environment.
- [ ] Perform manual product and visual QA.
- [ ] Keep README and project state aligned with verified behavior.

Acceptance: a judge can run or access the project and reproduce the demo.

### 4. Prepare and submit — pending

- [ ] Finalize README and third-party notices.
- [ ] Record how Codex and GPT-5.6 contributed.
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
