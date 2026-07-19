# Decision Log

This file is append-only. Do not rewrite history when a choice changes. Add a
new entry that explicitly supersedes the earlier decision.

## D-001 — Keep the source repository private during initial development

- Date: 2026-07-19
- Status: Accepted
- Context: The hackathon permits a private repository when judging access is
  granted, and the product and commercialization path are still being defined.
- Decision: Keep `makgunay/comic-creator` private and add no open-source license
  yet.
- Rationale: This satisfies the current build workflow while preserving the
  option to choose a license deliberately later.
- Consequence: Before submission, grant access to `testing@devpost.com` and
  `build-week-event@openai.com`. Publishing requires a new license decision.

## D-002 — Use a minimal canonical context system

- Date: 2026-07-19
- Status: Accepted
- Context: Decisions, state, and plans must survive irregular re-entry without
  producing a maze of status files or depending on one agent product.
- Decision: Use `PROJECT.md`, `RULES.md`, `STATE.md`, `PLAN.md`, and
  `DECISIONS.md`, with `AGENTS.md` as the entrypoint.
- Rationale: Each kind of information has one owner, and an agent can resume by
  reading two short live files before loading deeper context.
- Consequence: Maintain one active plan, use Git as the activity log, and add no
  session transcripts or new context file types without a demonstrated need.

## D-003 — Build a local-only Build Week application

- Date: 2026-07-20
- Status: Accepted
- Context: Hosting and production account infrastructure would consume limited
  Build Week time and expose the founder’s API account to judge traffic.
- Decision: Build a responsive local web app with a local server, filesystem
  persistence, server-only API credentials, and bundled sample mode.
- Rationale: This preserves a complete runnable product while the current
  Devpost requirements make a hosted website optional.
- Consequence: Judges use the video and sample mode without consuming the
  founder’s API; live generation from a cloned repo requires their own key.

## D-004 — Preserve exact child authorship

- Date: 2026-07-20
- Status: Accepted
- Context: The educational and product thesis fails if AI silently writes the
  comic or if image generation corrupts the child’s words.
- Decision: Limit GPT-5.6 to structured visual-direction compilation, use GPT
  Image for artwork, and render dialogue and captions locally as exact editable
  overlays.
- Rationale: AI removes the craft barrier while plot, events, and language stay
  under the child’s control.
- Consequence: Compiler output requires invariant validation, and image requests
  exclude dialogue and caption text.

## D-005 — Prioritize the solo four-panel core

- Date: 2026-07-20
- Status: Accepted
- Context: The research PRD contains a larger behavioral instrument, but the
  hackathon needs one polished journey that can be judged in under three
  minutes.
- Decision: Require one hero, four story beats, at least four panels, visual
  redirection, local persistence, sample mode, and PDF export. Treat same-device
  two-author mode as stretch work.
- Rationale: This is the smallest complete artifact that demonstrates the
  authorship-preserving differentiator.
- Consequence: Defer the AI-finish experiment, full instrumentation, stock cast,
  accounts, gallery, remote collaboration, and additional export formats.
