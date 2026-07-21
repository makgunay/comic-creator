# Project Brief

Last updated: 2026-07-21

## Working title

Comic Creator

## Stage

Build Week solo MVP implemented and deterministically verified. Checkpoint 3
is complete: D-010 supersedes D-007 with a 40-second observed live
panel-generation target;
the six Task 8 samples ranged from 26.049 to 38.477 seconds, so none exceeded
the accepted target. This is observed timing, not a guarantee.

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
overlays by default. A clearly opt-in experiment may ask GPT Image 2 to letter
only the child’s existing exact copy; the local text remains the editable source
of truth and fallback.

Guidance may structure the child's own ideas or ask one neutral reflective
question. A model may classify which story element needs attention, but it must
not generate the child-facing question, rewrite the child's text, or propose
story content.

## Accepted Build Week journey

1. Create and approve one original hero.
2. Choose cartoon, manga, or superhero style and refine its plain-language
   style notes.
3. Write Setup, Problem, Big Moment, and Ending.
4. Direct at least one panel for each beat and add more panels as needed, up to
   the local-project limit of 16.
5. Approve or redirect candidate artwork without destructive replacement.
6. View panels four per page and export a printable PDF.

The application is a local browser app with a local server, local filesystem
persistence, server-only API credentials, and bundled sample mode. It has no
hosting, accounts, cloud database, payments, public sharing, or photo uploads.

## Build Week success scenario

A first-time child can create one four-panel comic locally, revise its artwork,
retain exact authorship of every word, restore the project after restart, and
export a readable PDF without learning a general-purpose design tool.

The submission category is `Education`.

## Deliberate MVP boundary

The AI-finish experiment, full behavioral instrumentation, stock-character
library, gallery, remixing, remote collaboration, accounts, parent dashboard,
and additional export formats are deferred. Same-device pass-the-pen authorship
is part of the guided creative-studio pass; it adds no accounts or sharing.

See the approved
[MVP design](superpowers/specs/2026-07-20-comic-creator-mvp-design.md) for the
complete interaction, architecture, safety, and testing contract.
