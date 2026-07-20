# Comic Creator

Comic Creator is a local OpenAI Build Week app for children around ages 9-13.
A child writes the story, directs each picture, approves the artwork, and
exports a printable comic. The Build Week submission category is `Education`.

## What problem it solves

Children can have a complete story in mind but still struggle to turn it into a
finished visual artifact. Comic Creator lowers the illustration barrier without
taking over authorship. The result is productive screen time with a tangible
comic the child recognizes as their own.

## The authorship rule

The child owns every plot event, character fact, story beat, caption, and line
of dialogue. GPT-5.6 may choose constrained visual rendering parameters, and an
image model may illustrate those directions. The app never asks a model to
write or rewrite the story. Dialogue and captions remain exact local overlays
and are excluded from model prompts.

## What works

- Create and reopen a local comic through its opaque project URL.
- Describe and explicitly approve an original hero.
- Start from cartoon, manga, or superhero style notes, then edit them.
- Write Setup, Problem, Big Moment, and Ending.
- Direct four or more ordered panels with exact dialogue and captions; add
  panels to any story beat up to the 16-panel local-project limit.
- Generate, redirect, approve, or dismiss artwork without silently replacing
  the current approved version.
- Restore the project from local filesystem storage after a server restart;
  interrupted drawing attempts reopen as safe retryable failures.
- Preview four panels per page; additional panels create additional pages.
- Export approved artwork and exact overlays to a printable US Letter PDF.
- Explore and edit a bundled four-panel sample without an API key or paid call.

## Architecture

The browser client is React 19 with TypeScript and Vite. An Express 5 server
owns OpenAI calls, validation, safe error mapping, image membership checks, PDF
rendering, and filesystem persistence. Zod schemas are shared across the
browser-safe domain boundary. Project documents and square PNG assets stay
under the local `data/` directory, which is ignored by Git.

Live illustration is deliberately server-only:

1. exact child-authored visual facts are moderated;
2. GPT-5.6 Luna selects only constrained rendering choices;
3. GPT Image 2 generates a hero or edits a panel from the approved hero
   reference; and
4. the child explicitly approves or dismisses the candidate.

## Requirements

- Node.js 24 or newer
- npm
- A current desktop browser
- Optional for live drawing: an `OPENAI_API_KEY` from the runner's own OpenAI
  API project
- Optional for PDF inspection: Poppler tools such as `pdfinfo`,
  `pdftotext`, and `pdftoppm`

## Run locally

```bash
npm ci
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The API health endpoint is
[http://127.0.0.1:4173/api/health](http://127.0.0.1:4173/api/health).

Live drawing is optional. Use the secure OpenAI Platform API-key flow for your
own API project and provide `OPENAI_API_KEY` to the local server environment.
Keep the credential in `.env.local`, never in source control, browser storage,
project JSON, screenshots, chat, or the README. Restart `npm run dev` after
changing local environment configuration.

The app writes an opaque `project` ID into the local URL. Keep that URL to
reopen the saved comic after refreshing or restarting the local app.

To exercise the production server locally:

```bash
npm ci
npm run build
npm start
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173). The production
runtime keeps its TypeScript launcher as a pinned runtime dependency, so this
path continues to work after development-only packages are omitted.

## Sample mode

If no key is configured, the app starts in Sample mode. Choose **Explore the
sample** to create a writable local copy of “Nova and the Moon Kite.” Editing
the copy does not change tracked fixtures. Sample mode makes no OpenAI request
and incurs no API cost; drawing controls remain visibly disabled while editing,
navigation, persistence, Premiere, and PDF export continue to work.

## Run tests

Run the deterministic suite:

```bash
npm run verify
```

This performs strict typechecking, all domain/server/client/integration tests,
and the production client build. Tests replace the paid provider and do not
need a key.

The optional live smoke test makes two paid image requests using the runner's
own API project:

```bash
npm run smoke:openai
```

Live results vary and are reported separately from deterministic test results.

## OpenAI model roles

- `gpt-5.6-luna` compiles child-authored visual facts into a strict choice of
  shot size, camera angle, lighting, palette, and focus. It does not author
  prose or story content.
- `gpt-image-2` creates the square hero reference and reference-guided panel
  artwork.
- `omni-moderation-latest` checks the child-authored visual request before a
  generation call.

Model names are server-owned configuration. Exact dialogue, captions, title,
byline, and story beats do not enter image or compiler prompts.

## How Codex accelerated the build

Codex helped turn the approved product direction into checkpointed
implementation tasks, write tests before behavioral changes, build strict
schemas and safe provider boundaries, inspect runtime and PDF artifacts, run
responsive and accessibility QA, and review each task before the next one.
Codex also helped expose real integration defects, including project resume
after a browser restart and a clipped Hero heading, then verified their fixes.

## Human decisions

The founder chose the child-as-author principle, age range, Education category,
four-beat core, editable preset styles, explicit approval model, local-only
architecture, private-repository strategy, 35-second observed panel target,
and the decision to defer two-author mode. Humans also accepted the visual
direction and decided that sample mode should be the judging default.

These choices were not delegated to a model. Durable rationale is recorded in
[`docs/DECISIONS.md`](docs/DECISIONS.md).

## Privacy and safety boundary

- Credentials remain on the local server and are never returned by the public
  API.
- API requests must target a loopback host. Browser requests from non-loopback,
  null, malformed, or cross-site origins are rejected, and write requests must
  use JSON.
- Filesystem paths and image membership are validated before images or PDFs are
  served.
- Moderation fails closed; provider errors become short product-safe messages.
- Approved artwork and authored text survive failed or redirected generation.
- There are no accounts, cloud database, analytics, public sharing, photo
  uploads, or remote collaboration in this build.

This is a founder-supervised prototype, not a child-privacy compliance claim.
A production release would require dedicated legal, privacy, parental-consent,
abuse-prevention, and data-retention work.

## Known limitations

- Character consistency is best effort and live generation latency varies.
- The project URL must be retained; there is no recent-project gallery.
- PDF export uses standard embedded fonts and visibly rejects unsupported
  glyphs or text that cannot fit legibly.
- The same-device two-author mode is unstarted stretch work.
- There is no hosting, account system, public sharing, cloud backup, mobile
  native app, or production operations layer.
- Literacy improvement, retention, willingness to pay, and broader educational
  outcomes remain unproven.

## Build Week judging

No hosted website is required for this submission. Judges can run the project
locally, use Sample mode without a key or paid request, run `npm run verify`,
and reproduce the complete preview/PDF path. Live generation uses the runner's
own OpenAI API project.

The intended under-three-minute demo is:

1. state the authorship problem and promise;
2. show the child-authored hero, style notes, and four beats;
3. direct a panel, keep the approved image during redirection, and explicitly
   approve the candidate;
4. explain the separate GPT-5.6 Luna and GPT Image 2 roles;
5. reopen the opaque local project URL; and
6. show Premiere and download the printable PDF.

Before submission, the private repository still needs the required judging
access, the public YouTube demo, the primary Codex `/feedback` session ID, and
the completed Devpost entry.
