# Comic Creator Build Week MVP Design

Date: 2026-07-20

Status: Approved by the user

## Product thesis

Comic Creator is a local-first comic-making app for children aged roughly
9–13. The child authors the plot, character, action, and dialogue. AI acts as
an illustrator and removes the drawing barrier without taking over the story.

The Build Week submission optimizes for a polished, judgeable authorship loop.
It is not yet the full behavioral-research instrument described in the source
research.

## Build Week outcome

A first-time child can:

1. create and approve one original hero;
2. choose and refine a visual style;
3. write a four-beat story;
4. direct at least one panel for each beat;
5. revise artwork without losing their writing or approved images; and
6. export a printable one-page comic bearing their author credit.

The minimum finished comic has four panels. Longer stories may contain more
panels; the app paginates them four per page.

The recommended submission category is **Education** because the demonstrated
mechanism is authorship-preserving narrative construction and guided AI
literacy, not merely general entertainment. The user approved the written
specification and confirmed this category on 2026-07-20.

## Product guardrails

- AI never invents plot, events, dialogue, captions, or characters.
- The child’s dialogue and captions are rendered verbatim as editable overlays,
  not embedded by the image model.
- No points, badges, streaks, leaderboards, or engagement rewards.
- The product does not claim to prevent summer learning loss or guarantee
  literacy gains.
- The Build Week version is founder-supervised and local-only.
- No accounts, cloud profiles, public sharing, remote collaboration, payments,
  photo uploads, or real-name requirements.
- Author credit may use a nickname or first name. It stays local and is not sent
  to OpenAI.
- Editable style notes never expose or modify the system safety instructions.

## Scope

### Required core

- Local browser application with a small local server.
- One custom hero with an approved canonical reference image.
- Three visual presets: cartoon, manga, and superhero.
- A plain-language style field seeded from the selected preset, with Reset.
- Four story beats: Setup, Problem, Big Moment, and Ending.
- One or more panels per beat, with a minimum of four panels total.
- One-panel-at-a-time guided workshop.
- Child-authored action, setting, dialogue, and captions.
- Image generation and reference-guided regeneration.
- Quick visual-change controls plus optional free-text art direction.
- Non-destructive image versions with explicit approval.
- Four panels per page with automatic additional pages.
- Local autosave and recovery after restart.
- Functional bundled sample mode when no API key is configured.
- Printable PDF export.
- Child-friendly loading, retry, authentication, quota, network, and safety
  states.

### Stretch

- Same-device two-author “pass the comic” mode with alternating panel ownership
  and both author names on the cover.

Stretch work may begin only after every core acceptance check passes.

### Deferred

- “AI finishes it” research control.
- Full research instrumentation and parent-readable event analytics.
- Stock-character library and multi-character cast management.
- Flip-book HTML export.
- Speech-to-text and a dedicated dyslexia-font toggle.
- Accounts or “Sign in with ChatGPT.”
- Parent dashboards, galleries, remixing, public links, remote multiplayer,
  native app packaging, and print fulfillment.

## User experience

### 1. Launch

The app checks local configuration without exposing credentials to the browser.

- With an API key, the user can create and generate.
- Without an API key, the app opens a writable local copy of a bundled finished
  comic. The tracked fixture remains unchanged. All browsing, panel
  composition, pagination, and export interactions remain available.
  Generation controls explain that local API configuration is required.

### 2. Create the hero

The child describes one fictional hero’s appearance in their own words. The
app generates candidate reference images. The child explicitly approves one
candidate; it becomes the canonical hero reference for all panels.

Approval is reversible. Replacing the canonical reference warns that future
panels may no longer match earlier artwork. Existing panels are never silently
regenerated.

Character consistency is a best-effort system property, not a guarantee. The
implementation must validate the reference-image workflow early and retain a
clear Regenerate path when the hero drifts.

### 3. Choose the visual style

The child selects cartoon, manga, or superhero. Each preset supplies a
plain-language baseline such as line quality, color, and mood. The child may
edit those notes and can restore the original baseline at any time.

System safety, continuity, and authorship constraints are separate and
immutable.

### 4. Write the story spine

The app presents four named beat cards:

- **Setup:** Who is the hero, and where are they?
- **Problem:** What goes wrong?
- **Big Moment:** What is the most important action or choice?
- **Ending:** How does it finish?

The child writes every beat. Each beat starts with one panel and may gain
additional panels. Beats describe narrative structure; panels describe visual
moments; pages are derived presentation. These are separate data concepts.

The accepted story reference is authoritative for this setup screen: all four
beat cards appear in one row on wide desktop viewports, two columns from 761 px
through 1099 px, and one column at 760 px and below. This is responsive
presentation only. It does not cap the number of panels that a beat may gain.

### 5. Direct each panel

The workshop focuses on one panel at a time. A panel contains:

- action;
- setting;
- optional visual mood or framing;
- zero or more dialogue bubbles; and
- zero or more captions.

Generate creates an art-only candidate. Dialogue and captions are composed
locally over the approved image as editable vector/HTML layers.

After generation, the child may request visual changes using controls such as
expression, camera distance, lighting, and time of day, or enter a short custom
direction. A new result appears beside the approved version. The child chooses
**Use this version** before it becomes current.

Neither a failed nor a successful generation overwrites an approved image
automatically.

### 6. Premiere and export

The comic view derives pages from the ordered panel list, four panels per page.
It includes title and local author credit. The completion treatment celebrates
the artifact, not activity metrics.

Export produces a printable PDF using the same approved images and exact text
overlays shown in the comic view.

## Architecture

```text
Local browser UI
    |
    | localhost HTTP
    v
Local TypeScript/Node server
    |-- Project store on local filesystem
    |-- Safety gate
    |-- GPT-5.6 direction compiler
    |-- GPT Image generation gateway
    `-- PDF export service
            |
            v
        OpenAI API
```

The UI is a responsive React application. A small TypeScript/Node server serves
the built UI, owns filesystem access, and makes OpenAI requests. The server
reads `OPENAI_API_KEY` from a gitignored local environment file. The key is
never serialized into project data or returned to the browser.

The exact framework and package versions will be pinned in the implementation
plan. The architecture must support one documented command for local startup
and must not require Docker, a hosted database, or a cloud account.

## Component boundaries

| Component | Responsibility | Depends on |
| --- | --- | --- |
| App shell | Navigation, setup state, sample mode, global error presentation | Project service |
| Project service | Create, load, validate, autosave, and version local projects | Project store |
| Story workshop | Beats, ordered panels, guided focus, and pagination | Project service |
| Panel composer | Editable dialogue/caption overlays and image-version approval | Story workshop |
| Safety gate | Validate child visual direction before any model call | OpenAI moderation |
| Direction compiler | Convert authored fields into visual-only structured data | GPT-5.6 adapter |
| Image gateway | Create hero and panel candidates using approved references | GPT Image adapter |
| Export renderer | Compose approved artwork and local text into printable PDF | Project service |
| Sample provider | Copy deterministic bundled sample data into a writable local project | Static assets, project service |

Model-specific SDK calls stay inside adapters so provider internals can change
without changing story, panel, storage, or export code.

## Model roles

### GPT-5.6 direction compiler

The default compiler model is `gpt-5.6-luna` through the Responses API with
structured output and low reasoning effort. Luna is appropriate because this is
a small, constrained transformation rather than an open-ended reasoning task.

Input contains only the child-authored visual fields, approved hero description,
style notes, continuity facts, and immutable constraints.

Output may normalize:

- visible subjects;
- action and pose;
- setting and props;
- expression and mood;
- camera framing;
- lighting and palette;
- visual style; and
- continuity requirements.

Output must not add a new person, event, object with plot significance,
dialogue, caption, motivation, resolution, or story beat. The server validates
the structured response against these invariants before image generation.

Official reference:
[OpenAI model guide](https://developers.openai.com/api/docs/models).

### GPT Image artwork

The default image model is `gpt-image-2`, using its image-input/editing support
to supply the canonical hero reference. Draft panels use square medium-quality
output unless live testing shows the latency budget cannot be met.

The image request excludes dialogue and caption text. The app owns typography
and bubble layout.

Official reference:
[GPT Image 2 model](https://developers.openai.com/api/docs/models/gpt-image-2).

## Data model

Every project document has a `schemaVersion` and stable IDs.

```text
Project
  id, schemaVersion, title, localAuthorCredit, createdAt, updatedAt
  hero
  visualStyle
  beats[]
  panels[]

Hero
  childDescription
  approvedReferenceImageId
  candidateImageIds[]

VisualStyle
  presetId
  baselineNotes
  editedNotes

Beat
  id
  type: setup | problem | bigMoment | ending
  childText
  panelIds[]

Panel
  id, beatId, order
  action, setting, mood, framing
  dialogueBubbles[]
  captions[]
  approvedImageVersionId
  imageVersions[]
  generationStatus

ImageVersion
  id, localPath, createdAt
  sourceReferenceImageId
  childRevisionDirection
  status: candidate | approved | rejected
```

Dialogue bubble geometry, speaker labels, and caption geometry are local
presentation data. They are never delegated to the image model.

## Persistence

Writable user data lives outside tracked source and is excluded by
`.gitignore`:

```text
data/
  projects/<project-id>/project.json
  projects/<project-id>/images/
```

Bundled sample data and sample images are tracked separately under a read-only
sample-assets directory.

Project JSON writes use a temporary file followed by atomic rename. Before a
successful replacement, the previous valid document is retained as one rolling
backup. On startup:

1. validate the current project document;
2. fall back to the previous valid copy if necessary; and
3. surface a recoverable error rather than discarding data.

An interrupted `generating` state becomes `failed-retryable` after restart.

## Generation flow

### Hero

1. Save the child’s description locally.
2. Run the safety gate.
3. Compile visual-only hero instructions.
4. Request hero candidates from GPT Image.
5. Save candidates locally.
6. Wait for explicit child approval.

### Panel

1. Save all child-authored panel fields immediately.
2. Run the safety gate on the visual direction.
3. Compile structured visual instructions with GPT-5.6.
4. Validate that the compiler did not introduce story content.
5. Send the visual instructions and canonical hero reference to GPT Image.
6. Save the result as a candidate image version.
7. Compose dialogue and captions locally for preview.
8. Wait for explicit approval before changing the panel’s current image.

Only one generation request runs per local project at a time. This prevents
accidental duplicate spend and simplifies recovery.

## Error handling

- **Missing key:** open sample mode and show local setup guidance.
- **Invalid key:** preserve work and identify authentication as the problem.
- **Quota or rate limit:** preserve work, disable immediate retries briefly,
  and explain that API availability is limited.
- **Network failure or timeout:** preserve work and offer Retry.
- **Safety refusal:** preserve the original direction and offer a neutral,
  child-friendly prompt to change the visual request.
- **Compiler invariant violation:** do not call the image model; log a local
  diagnostic and allow Retry.
- **Image-generation failure:** retain the approved image and mark only the new
  candidate attempt as failed.
- **Restart during generation:** mark the attempt retryable; do not pretend the
  request is still running.
- **Export failure:** leave the project unchanged and allow another export.

Technical diagnostics stay in local logs. Child-facing messages remain short
and do not expose raw provider responses or policy text.

## Safety and privacy boundary

- Founder-supervised local testing only.
- No public deployment to children in this phase.
- No photos, location, email, account identifier, or required real name.
- Strip local author credit and local-only IDs from model requests.
- Moderate child-authored visual direction before the compiler and image call.
- Keep immutable authorship and safety instructions server-side.
- Store API credentials only in local environment configuration.
- Never write credentials, raw provider headers, or secrets to logs.
- Complete a dedicated child-privacy and legal review before distribution
  beyond the supervised test cohort.

This is a product-safety boundary, not a claim of COPPA or international
child-privacy compliance.

## Performance and cost

- Target hero generation: at most 60 seconds.
- Target panel generation: at most 40 seconds, with an honest drawing wait
  state because live performance is observed rather than guaranteed.
- Display a clear progress state during generation.
- Use one generation at a time and require explicit revision actions.
- Default to medium-quality square panel art.
- Record request duration, model name, and provider request ID locally for
  debugging, but no child personal information.
- Do not implement unlimited automatic retries.

The implementation plan must include a live latency and cost smoke test before
building the full generation UI. If the reference-guided panel request cannot
meet the latency or consistency threshold, the plan must stop and revise the
generation approach rather than hiding the failure.

## Testing strategy

### Unit

- Four panels produce one page; panels five through eight produce page two.
- Beats and panels retain independent ordering and identity.
- Project save/load round-trips without data loss.
- Atomic-write recovery loads the previous valid document.
- The direction compiler schema rejects invented story fields.
- Dialogue and caption text remains byte-for-byte unchanged.
- New image candidates cannot overwrite approved versions.
- Sample mode never attempts a paid API request.

### Integration

- Mocked hero generation through approval.
- Mocked four-beat, four-panel creation through PDF export.
- Failed compilation never reaches the image gateway.
- Authentication, quota, timeout, refusal, and restart states preserve work.
- A longer comic paginates and exports correctly.

### Live provider

- One hero-reference generation smoke test.
- One reference-guided panel generation smoke test.
- One visual-redirection smoke test proving the previous image remains.
- Record observed latency and inspect character consistency manually.

Live tests are separate from deterministic automated tests and require an
explicitly configured local API key.

### Manual product and visual QA

- First-time flow requires no tool instruction.
- Child-facing language is readable and not babyish.
- Keyboard navigation, focus, labels, contrast, and zoom are usable.
- Loading, refusal, retry, sample mode, and PDF output are visually checked.
- The complete flow is rehearsed from a clean clone using only the README.

## Build Week demo and judging path

The local architecture is compatible with Build Week because a hosted website
is optional. Judges receive the repository, setup instructions, sample data,
and the public demo video.

The under-three-minute video will:

1. state the drawing-barrier and authorship problem;
2. show the four-beat story and approved hero;
3. redirect one panel and compare image versions;
4. show that dialogue remains the child’s exact editable text;
5. reveal the complete comic and export it; and
6. explain that Codex built the workflow while GPT-5.6 performs constrained
   visual-direction compilation.

The README must include:

- prerequisites and one-command startup;
- API-key configuration and sample-mode behavior;
- clean testing instructions;
- sample data;
- model roles and authorship safeguards;
- where Codex accelerated development;
- important human decisions;
- known limitations; and
- the required judging-access instructions.

## Acceptance criteria

The core is complete only when all of the following are true:

- A clean clone can be configured and started from the README.
- The sample comic works with no API key and makes no paid call.
- A child can create and approve one hero.
- A child can complete all four beats and at least four panels.
- GPT-5.6 supplies visual-only structured instructions.
- GPT Image produces reference-guided candidate artwork.
- Dialogue and captions remain exact editable overlays.
- Approved artwork survives regeneration failures and alternatives.
- Projects restore after process and browser restart.
- Additional panels paginate four per page.
- The finished comic exports as a readable printable PDF.
- Automated, live-provider, and manual validation are reported separately.
- The demonstrated flow fits within the Build Week video limit.

## Explicit risks

- Reference-guided image generation may still drift across panels.
- Image latency may break the guided creative flow.
- Four beats may feel restrictive to some older children.
- A local prototype is not yet usable by ordinary families without technical
  API setup.
- The product has not yet proved repeat engagement, learning transfer,
  willingness to pay, or that co-creation improves retention.

These risks must be stated honestly in the README and submission. They are not
resolved by the Build Week prototype.
