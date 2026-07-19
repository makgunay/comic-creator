# Project Brief

Last updated: 2026-07-20

## Working title

Comic Creator

## Stage

Build Week MVP design approved; written specification awaiting user review.

## Product definition

Children aged roughly 9–13 often have stories they want to tell but cannot turn
them into a finished visual artifact because drawing a complete comic is a high
barrier.

Comic Creator lets a child author the story, hero, action, and dialogue while
directing AI illustration. The intended result is a printable comic the child
recognizes as their own work.

## Audience

- Primary: children aged approximately 9–13 who enjoy inventing stories.
- Supporting: parents, guardians, or educators who help children create safely.

## Core promise

Screen time that produces a story the child made instead of content the child
only consumed.

## Authorship principle

The child remains the author and director. GPT-5.6 may translate the child’s
direction into constrained visual instructions, and an image model may
illustrate it. AI must not invent plot, dialogue, captions, characters, or
story events. Dialogue and captions are rendered locally as exact editable
overlays.

## Accepted Build Week journey

1. Create and approve one original hero.
2. Choose cartoon, manga, or superhero style and refine its plain-language
   style notes.
3. Write Setup, Problem, Big Moment, and Ending.
4. Direct at least one panel for each beat.
5. Approve or redirect candidate artwork without destructive replacement.
6. View panels four per page and export a printable PDF.

The Build Week version is a local browser app with a local server, local
filesystem persistence, server-only API credentials, and bundled sample mode.
It has no hosting, accounts, cloud database, payments, public sharing, or photo
uploads.

## Build Week success scenario

A first-time child can create one four-panel comic locally, revise its artwork,
retain exact authorship of every word, restore the project after restart, and
export a readable PDF without learning a general-purpose design tool.

The recommended submission category is `Education`; it will be locked when the
user approves the written specification.

## Deliberate MVP boundary

Same-device two-author mode is a stretch feature. The AI-finish experiment,
full behavioral instrumentation, stock-character library, gallery, remixing,
remote collaboration, accounts, parent dashboard, and additional export
formats are deferred.

See the approved
[MVP design](superpowers/specs/2026-07-20-comic-creator-mvp-design.md) for the
complete interaction, architecture, safety, and testing contract.
