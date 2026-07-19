# Agent Operating Contract

This file is the entrypoint for any person or agent working in this repository.
The workflow is deliberately tool-neutral and small.

## Start or resume work

1. Read `docs/STATE.md` and `docs/PLAN.md` completely.
2. Read `docs/RULES.md`.
3. Read `docs/PROJECT.md` when product scope or user experience is involved.
4. Read the latest relevant entries in `docs/DECISIONS.md`.
5. Verify the checkout before editing: working directory, branch, upstream,
   HEAD, worktree list, and working-tree status.
6. Inspect the actual code, tests, and runtime surfaces relevant to the task.

Do not infer implementation state from plans or prior conversation. Code,
tests, deployments, and visible runtime evidence are authoritative for claims
about what currently works.

## Canonical files

| File | Owns | Update when |
| --- | --- | --- |
| `docs/PROJECT.md` | Stable problem, audience, promise, and product boundaries | Product intent materially changes |
| `docs/RULES.md` | Non-negotiable external and repository constraints | A rule is added, removed, or reverified |
| `docs/STATE.md` | Current stage, focus, facts, blockers, and next actions | The working reality changes |
| `docs/PLAN.md` | The one active plan and its checkpoints | Scope, ordering, or checkpoint status changes |
| `docs/DECISIONS.md` | Durable choices and their rationale | A consequential choice is accepted or superseded |

Do not duplicate the same detail across files. Link to its canonical owner.
Git history is the activity log; do not create session transcripts or daily
progress files.

## Working loop

### Before

- Confirm the requested outcome and current checkpoint.
- Resolve unknowns from repository or runtime evidence before asking the user.
- Update `docs/PLAN.md` first if the work materially changes scope or ordering.
- Do not turn tentative ideas into product facts.

### During

- Keep changes scoped to the active checkpoint.
- Record evidence for claims that affect product or engineering decisions.
- Prefer reversible changes and small coherent commits.
- Do not create new context files when an existing canonical file fits.

### Finish

- Validate in proportion to risk.
- Update checkpoint status in `docs/PLAN.md`.
- Update `docs/STATE.md` so the next agent can resume without chat history.
- Append to `docs/DECISIONS.md` only for a durable choice, not routine work.
- State what was verified separately from what still needs manual or live proof.

## Context limits

- Keep `STATE.md` under roughly 100 lines.
- Keep the active `PLAN.md` under roughly 150 lines.
- Keep each decision entry concise: context, decision, rationale, consequences.
- Maintain only one active plan. When it is complete, move it to
  `docs/archive/YYYY-MM-DD-<topic>.md` and replace it with the next active plan.
- Create `docs/archive/` only when the first archive is needed.
- Archive useful material instead of deleting it. If deletion is necessary,
  always use Trash; never permanently delete.

## Git and collaboration

- Stay on the current attached checkout unless the work is blocked or parallel
  work is explicitly requested.
- For branches that will use PR review, Bugbot, CodeRabbit, or Codex UI
  commit/push, create or fork a Codex-managed worktree/task first. Do not create
  a shell-only worktree for that workflow.
- Preserve unrelated user changes.
- Do not push, publish, submit, change visibility, or grant repository access
  unless the user authorizes that action.

## Conflict handling

- Latest explicit user direction wins.
- Official hackathon rules win over summaries, announcements, or remembered
  requirements.
- Accepted decisions remain active until a later decision explicitly
  supersedes them.
- When prose and implementation disagree, report the mismatch and update the
  stale context as part of the scoped task.
