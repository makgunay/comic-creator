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

## D-006 — Submit in the Education category

- Date: 2026-07-20
- Status: Accepted
- Context: Comic Creator could fit a general consumer category, but its specific
  mechanism and evidence concern narrative construction, creative agency, and
  guided AI literacy.
- Decision: Submit the Build Week project in `Education`.
- Rationale: The category aligns with the demonstrated problem, research, and
  impact case rather than treating learning as incidental marketing.
- Consequence: Submission claims must remain narrow: authorship and productive
  creation, not proven literacy gains or summer-loss prevention.

## D-007 — Use a 40-second observed live panel-generation target

- Date: 2026-07-21
- Status: Accepted
- Context: Tuned matched reference-panel requests measured 31.272 and 32.335
  seconds and retained the violet jacket, round goggles, curly hair, and
  moon-kite spool. The original 35-second value was accepted on 2026-07-20.
  Six later Task 8 panel-image runs measured 26.049, 27.737, 28.654, 35.641,
  36.151, and 38.477 seconds (mean 32.118 seconds, median 32.148 seconds,
  maximum 38.477 seconds). Three of six exceeded 35 seconds; none exceeded
  40 seconds.
- Decision: Supersede the original 35-second value with a 40-second observed
  live panel-generation target.
- Rationale: The six-run evidence shows material normal live-model variance
  above 35 seconds while remaining within 40 seconds and retaining the
  established recognizable reference continuity evidence.
- Consequence: The UI must present an honest drawing wait state, and generation
  performance remains observed rather than guaranteed. This target is an
  acceptance observation, not a promise for every live request.

## D-008 — Make the accepted four-beat story layout authoritative

- Date: 2026-07-20
- Status: Accepted
- Context: The accepted story reference shows the complete four-beat spine at
  once on a wide desktop, while smaller screens still need readable controls.
- Decision: Present exactly the four required beat cards in one row on wide
  desktop viewports, two columns from 761 px through 1099 px, and one column at
  760 px and below.
- Rationale: Seeing setup, problem, big moment, and ending together makes the
  narrative arc legible without causing horizontal overflow on mobile.
- Consequence: This breakpoint choice controls presentation only. It does not
  cap the number of panels a beat may gain during panel direction.

## D-009 — Preserve source aspect differently for screen and print

- Date: 2026-07-20
- Status: Accepted
- Context: Approved artwork is validated as square PNGs, while the accepted
  Premiere reference uses landscape comic panels.
- Decision: Use aspect-preserving cover crops inside landscape browser frames,
  but use square art boxes in the printable PDF so source artwork is never
  stretched. In both surfaces, overlay coordinates are normalized to the
  displayed art frame.
- Rationale: The browser stays faithful to the accepted 2x2 composition while
  the printed artifact preserves the complete square illustration.
- Consequence: The browser may crop artwork edges, while the PDF shows the full
  image. Both surfaces use only approved images and exact local overlay text.
