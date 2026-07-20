# Comic Creator MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished local Comic Creator in which a child authors one hero, four story beats, panel action, and exact dialogue while GPT-5.6 supplies constrained visual direction and GPT Image 2 supplies non-destructive candidate artwork.

**Architecture:** A responsive React client talks to a local Express server. The server owns schema-validated filesystem persistence, OpenAI calls, image files, and PDF export; model-specific behavior is isolated behind generation adapters. The core is built test-first, with a live reference-image feasibility gate before the full workshop UI.

**Tech Stack:** Node.js 24+, TypeScript 7.0.2, React 19.2.7, Vite 8.1.5, Express 5.2.1, Zod 4.4.3, OpenAI JavaScript SDK 6.48.0, PDF-Lib 1.17.1, Vitest 4.1.10, React Testing Library 16.3.2, Supertest 7.2.2.

## Global Constraints

- Run locally; do not add hosting, accounts, cloud storage, payments, photo uploads, or public sharing.
- Keep `OPENAI_API_KEY` server-only and load it from local environment configuration.
- Use `gpt-5.6-luna` for constrained rendering choices, `gpt-image-2` for artwork, and `omni-moderation-latest` for input moderation.
- AI must not invent or rewrite plot, events, characters, dialogue, or captions.
- Render dialogue and captions locally and preserve them byte-for-byte.
- Support one custom hero, three editable style presets, four named beats, at least one panel per beat, and four panels per page.
- Treat story beats, ordered panels, and derived pages as separate concepts.
- Never replace approved artwork automatically; every generation result starts as a candidate.
- Allow one generation request per project at a time.
- Sample mode must work without an API key and must never make a paid request.
- Collect no required real name, photo, email, location, or account identifier.
- Use a nickname or first name only for local author credit and strip it from model requests.
- Keep child-facing copy short, readable, and appropriate for ages 9–13 without sounding babyish.
- Use the approved visual language: warm paper background `#f4ead7`, off-white cards `#fffdf7`, ink `#202020`, primary purple `#6f51d8`, mint `#d9f2e8`, amber `#ffe6bc`, blue `#daeffd`, thick ink borders, and visible keyboard focus.
- Same-device two-author mode is outside this core plan and begins only after every acceptance check passes.
- Preserve the untracked `.superpowers/` brainstorming workspace.
- Do not push, publish, submit, change repository visibility, or grant access without explicit user authorization.
- If execution will use PR review, Bugbot, CodeRabbit, or Codex UI commit/push, first create or fork a Codex-managed worktree/task; do not create a shell-only worktree.
- Use Trash for any deletion.

## Source Specification

- `docs/superpowers/specs/2026-07-20-comic-creator-mvp-design.md`
- `docs/PROJECT.md`
- `docs/RULES.md`
- `docs/DECISIONS.md`

## File Map

### Root configuration

| Path | Responsibility |
| --- | --- |
| `package.json` | Exact dependencies and local command surface |
| `package-lock.json` | Reproducible dependency graph |
| `.gitignore` | Secrets, local projects, generated smoke artifacts, build output |
| `.env.example` | Non-secret model and port names |
| `tsconfig.json` | Shared strict TypeScript settings |
| `vite.config.ts` | React client build and `/api` proxy |
| `vitest.config.ts` | Shared jsdom-capable deterministic test environment |
| `index.html` | Client entry document |

### Shared domain

| Path | Responsibility |
| --- | --- |
| `src/domain/project.ts` | Zod schemas, domain types, and project factory |
| `src/domain/pagination.ts` | Derive four-panel pages from panel order |
| `src/domain/image-versions.ts` | Candidate/approval transitions |
| `src/domain/api.ts` | API request, response, and error contracts |
| `src/domain/panel-layout.ts` | Normalized bubble/caption geometry shared by web and PDF |

### Server

| Path | Responsibility |
| --- | --- |
| `src/server/index.ts` | Process startup and shutdown |
| `src/server/app.ts` | Express composition and route registration |
| `src/server/config.ts` | Environment parsing and safe public config |
| `src/server/storage/project-store.ts` | Schema-validated atomic project persistence |
| `src/server/storage/sample-provider.ts` | Copy tracked sample data into writable local storage |
| `src/server/generation/contracts.ts` | Provider interfaces and rendering-choice schema |
| `src/server/generation/openai-provider.ts` | Moderation, Responses API, and image endpoint calls |
| `src/server/generation/prompt-builder.ts` | Deterministic image prompt composition |
| `src/server/generation/generation-service.ts` | Safety, compile, generate, persist, and per-project lock |
| `src/server/generation/provider-errors.ts` | Provider-to-product error mapping |
| `src/server/export/pdf-layout.ts` | Pure page and exact-text draw-command layout |
| `src/server/export/pdf-renderer.ts` | Printable PDF composition from layout commands |
| `src/server/routes/config-routes.ts` | Public non-secret capability route |
| `src/server/routes/project-routes.ts` | Create, load, save, and sample-copy routes |
| `src/server/routes/generation-routes.ts` | Hero/panel generation and approval routes |
| `src/server/routes/export-routes.ts` | PDF download route |

### Client

| Path | Responsibility |
| --- | --- |
| `src/client/main.tsx` | React mount |
| `src/client/App.tsx` | Top-level loading, route state, and error boundary |
| `src/client/api/client.ts` | Typed HTTP calls and API error decoding |
| `src/client/state/use-project.ts` | Project loading and debounced autosave |
| `src/client/components/AppFrame.tsx` | Header, progress, navigation, and page frame |
| `src/client/components/StatusNotice.tsx` | Loading, refusal, quota, retry, and sample notices |
| `src/client/features/launch/LaunchScreen.tsx` | Create project or open sample |
| `src/client/features/hero/HeroWorkshop.tsx` | Hero description, generation, and approval |
| `src/client/features/style/StylePicker.tsx` | Presets, seeded notes, and reset |
| `src/client/features/story/StorySpine.tsx` | Four child-authored beat cards |
| `src/client/features/panels/PanelWorkshop.tsx` | Guided active-panel editor |
| `src/client/features/panels/PanelCanvas.tsx` | Artwork plus editable text overlays |
| `src/client/features/panels/ImageVersionChooser.tsx` | Candidate comparison and approval |
| `src/client/features/comic/ComicPreview.tsx` | Derived pages and completion view |
| `src/client/styles/tokens.css` | Color, type, spacing, border, and focus tokens |
| `src/client/styles/app.css` | Responsive layout and print-safe composition |

### Fixtures, scripts, and tests

| Path | Responsibility |
| --- | --- |
| `sample-assets/moon-kite/project.json` | Read-only “Nova and the Moon Kite” sample |
| `sample-assets/moon-kite/images/*.png` | Original tracked sample panels |
| `scripts/build-sample-assets.ts` | Deterministically render original sample PNGs |
| `scripts/smoke-openai.ts` | Live compiler, hero, and reference-panel smoke test |
| `tests/domain/*.test.ts` | Pure domain behavior |
| `tests/server/*.test.ts` | Store, routes, generation, and PDF behavior |
| `tests/client/*.test.tsx` | Child-facing workflow behavior |
| `tests/integration/comic-journey.test.ts` | Mocked complete four-panel service journey |

---

### Task 1: Establish the local TypeScript application foundation

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `tests/setup.ts`
- Create: `src/server/app.ts`
- Create: `src/server/index.ts`
- Create: `src/client/main.tsx`
- Create: `src/client/App.tsx`
- Create: `src/client/styles/tokens.css`
- Create: `src/client/styles/app.css`
- Test: `tests/server/health.test.ts`

**Interfaces:**
- Produces: `createApp(): Express`
- Produces: `GET /api/health -> { ok: true }`
- Produces: one-command development startup via `npm run dev`

- [ ] **Step 1: Create the exact package manifest**

```json
{
  "name": "comic-creator",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "dev": "concurrently -k -n api,web \"npm:dev:server\" \"npm:dev:client\"",
    "dev:server": "tsx watch src/server/index.ts",
    "dev:client": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build",
    "start": "NODE_ENV=production tsx src/server/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "verify": "npm run typecheck && npm test && npm run build",
    "smoke:openai": "tsx scripts/smoke-openai.ts",
    "sample:build": "tsx scripts/build-sample-assets.ts"
  },
  "dependencies": {
    "dotenv": "17.4.2",
    "express": "5.2.1",
    "openai": "6.48.0",
    "pdf-lib": "1.17.1",
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "6.9.1",
    "@testing-library/react": "16.3.2",
    "@testing-library/user-event": "14.6.1",
    "@types/express": "5.0.6",
    "@types/node": "24.13.3",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "@types/supertest": "7.2.1",
    "@vitejs/plugin-react": "6.0.3",
    "concurrently": "10.0.3",
    "jsdom": "29.1.1",
    "sharp": "0.35.3",
    "supertest": "7.2.2",
    "tsx": "4.23.1",
    "typescript": "7.0.2",
    "vite": "8.1.5",
    "vitest": "4.1.10"
  }
}
```

- [ ] **Step 2: Install the pinned dependency graph**

Run: `npm install`

Expected: `package-lock.json` is created; npm exits `0`; no dependency uses an unpinned top-level version.

- [ ] **Step 3: Add local-only and secret exclusions**

```gitignore
node_modules/
dist/
.env
.env.local
data/
tmp/
coverage/
*.log
.DS_Store
```

```dotenv
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5.6-luna
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_MODERATION_MODEL=omni-moderation-latest
PORT=4173
DATA_DIR=data
```

- [ ] **Step 4: Add strict TypeScript, Vite, and Vitest configuration**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "tests", "scripts", "vite.config.ts", "vitest.config.ts"]
}
```

```ts
// vite.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:4173" },
  },
  build: { outDir: "dist" },
});
```

```ts
// vitest.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    clearMocks: true,
  },
});
```

```ts
// tests/setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Write the failing server health test**

```ts
// tests/server/health.test.ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app";

describe("GET /api/health", () => {
  it("reports the local server as ready", async () => {
    const response = await request(createApp()).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
```

- [ ] **Step 6: Run the test to verify the foundation is absent**

Run: `npm test -- tests/server/health.test.ts`

Expected: FAIL because `src/server/app.ts` does not exist.

- [ ] **Step 7: Implement the minimal server and client shell**

```ts
// src/server/app.ts
import express, { type Express } from "express";

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (_request, response) => response.json({ ok: true }));
  return app;
}
```

```ts
// src/server/index.ts
import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 4173);
const app = createApp();

if (process.env.NODE_ENV === "production") {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const dist = path.resolve(root, "../../dist");
  app.use(express.static(dist));
  app.get("*splat", (_request, response) => response.sendFile(path.join(dist, "index.html")));
}

app.listen(port, "127.0.0.1", () => {
  console.log(`Comic Creator API listening on http://127.0.0.1:${port}`);
});
```

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Comic Creator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>
```

```tsx
// src/client/App.tsx
export function App() {
  return (
    <main className="app-shell">
      <p className="eyebrow">OpenAI Build Week</p>
      <h1>Comic Creator</h1>
      <p>Write the story. Direct the art. Make a comic that is yours.</p>
    </main>
  );
}
```

```tsx
// src/client/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/tokens.css";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

```css
/* src/client/styles/tokens.css */
:root {
  color: #202020;
  background: #f4ead7;
  font-family: Inter, ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
  --paper: #f4ead7;
  --card: #fffdf7;
  --ink: #202020;
  --purple: #6f51d8;
  --mint: #d9f2e8;
  --amber: #ffe6bc;
  --blue: #daeffd;
  --focus: #174d72;
}
```

```css
/* src/client/styles/app.css */
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; min-height: 100vh; background: var(--paper); }
button, input, textarea, select { font: inherit; }
:focus-visible { outline: 4px solid var(--focus); outline-offset: 3px; }
.app-shell { width: min(1100px, calc(100% - 32px)); margin: 0 auto; padding: 64px 0; }
.eyebrow { color: var(--purple); font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
h1 { max-width: 12ch; margin: 0; font-size: clamp(3rem, 8vw, 6rem); line-height: .9; }
```

- [ ] **Step 8: Verify the runnable foundation**

Run: `npm run verify`

Expected: typecheck PASS, one test PASS, Vite build PASS.

- [ ] **Step 9: Commit the foundation**

```bash
git add package.json package-lock.json .gitignore .env.example tsconfig.json vite.config.ts vitest.config.ts index.html src/client src/server tests/setup.ts tests/server/health.test.ts
git commit -m "chore: scaffold local Comic Creator app"
```

### Task 2: Define the project domain and non-destructive state transitions

**Files:**
- Create: `src/domain/project.ts`
- Create: `src/domain/pagination.ts`
- Create: `src/domain/image-versions.ts`
- Create: `src/domain/api.ts`
- Create: `src/domain/panel-layout.ts`
- Create: `tests/fixtures/project-fixtures.ts`
- Test: `tests/domain/project.test.ts`
- Test: `tests/domain/pagination.test.ts`
- Test: `tests/domain/image-versions.test.ts`

**Interfaces:**
- Produces: `ProjectSchema`, `Project`, `Panel`, `ImageVersion`
- Produces: `createProject(input): Project`
- Produces: `paginatePanels(panels): Panel[][]`
- Produces: `approveImageVersion(panel, versionId): Panel`
- Produces: `ApiErrorPayload`

- [ ] **Step 1: Write failing tests for the four-beat project factory**

```ts
// tests/domain/project.test.ts
import { describe, expect, it } from "vitest";
import { createProject, ProjectSchema } from "../../src/domain/project";

describe("createProject", () => {
  it("creates four beats and one panel for each beat", () => {
    const project = createProject({
      title: "Nova and the Moon Kite",
      localAuthorCredit: "M.",
    });

    expect(project.beats.map((beat) => beat.type)).toEqual([
      "setup",
      "problem",
      "bigMoment",
      "ending",
    ]);
    expect(project.panels).toHaveLength(4);
    expect(project.beats.every((beat) => beat.panelIds.length === 1)).toBe(true);
    expect(ProjectSchema.parse(project)).toEqual(project);
  });
});
```

- [ ] **Step 2: Write failing pagination and image-approval tests**

```ts
// tests/domain/pagination.test.ts
import { describe, expect, it } from "vitest";
import { paginatePanels } from "../../src/domain/pagination";

describe("paginatePanels", () => {
  it("derives pages of four without changing panel order", () => {
    const panels = Array.from({ length: 8 }, (_, index) => ({ id: `p${index + 1}`, order: index }));
    expect(paginatePanels(panels).map((page) => page.map((panel) => panel.id))).toEqual([
      ["p1", "p2", "p3", "p4"],
      ["p5", "p6", "p7", "p8"],
    ]);
  });
});
```

```ts
// tests/domain/image-versions.test.ts
import { describe, expect, it } from "vitest";
import { approveImageVersion } from "../../src/domain/image-versions";
import { makeImageVersion, makePanel } from "../fixtures/project-fixtures";

describe("approveImageVersion", () => {
  it("approves the selected candidate and preserves every version", () => {
    const panel = makePanel({
      approvedImageVersionId: "old",
      imageVersions: [
        makeImageVersion({ id: "old", localPath: "images/old.png", status: "approved" }),
        makeImageVersion({ id: "new", localPath: "images/new.png", status: "candidate" }),
      ],
    });
    const updated = approveImageVersion(panel, "new");
    expect(updated.approvedImageVersionId).toBe("new");
    expect(updated.imageVersions).toHaveLength(2);
    expect(updated.imageVersions.find((version) => version.id === "old")?.status).toBe("rejected");
  });
});
```

- [ ] **Step 3: Run domain tests and verify they fail**

Run: `npm test -- tests/domain`

Expected: FAIL because the domain modules and fixture factory do not exist.

- [ ] **Step 4: Implement the schema-validated domain**

```ts
// src/domain/project.ts
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const BeatTypeSchema = z.enum(["setup", "problem", "bigMoment", "ending"]);
export const StylePresetSchema = z.enum(["cartoon", "manga", "superhero"]);
export const GenerationStatusSchema = z.enum(["idle", "generating", "failed-retryable"]);

export const TextOverlaySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["dialogue", "caption"]),
  text: z.string(),
  speaker: z.string().optional(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
});

export const ImageVersionSchema = z.object({
  id: z.string().min(1),
  localPath: z.string(),
  createdAt: z.string().datetime(),
  sourceReferenceImageId: z.string().optional(),
  providerRequestId: z.string().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  childRevisionDirection: z.string(),
  status: z.enum(["candidate", "approved", "rejected"]),
});

export const PanelSchema = z.object({
  id: z.string().min(1),
  beatId: z.string().min(1),
  order: z.number().int().nonnegative(),
  action: z.string(),
  setting: z.string(),
  mood: z.string(),
  framing: z.string(),
  overlays: z.array(TextOverlaySchema),
  approvedImageVersionId: z.string().optional(),
  imageVersions: z.array(ImageVersionSchema),
  generationStatus: GenerationStatusSchema,
});

export const BeatSchema = z.object({
  id: z.string().min(1),
  type: BeatTypeSchema,
  childText: z.string(),
  panelIds: z.array(z.string()),
});

export const ProjectSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  title: z.string().min(1),
  localAuthorCredit: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  hero: z.object({
    childDescription: z.string(),
    approvedReferenceImageId: z.string().optional(),
    imageVersions: z.array(ImageVersionSchema),
  }),
  visualStyle: z.object({
    presetId: StylePresetSchema,
    baselineNotes: z.string(),
    editedNotes: z.string(),
  }),
  beats: z.array(BeatSchema).length(4),
  panels: z.array(PanelSchema).min(4),
});

export type Project = z.infer<typeof ProjectSchema>;
export type Panel = z.infer<typeof PanelSchema>;
export type ImageVersion = z.infer<typeof ImageVersionSchema>;

const beatTypes = BeatTypeSchema.options;
const cartoonNotes = "Bold ink outlines, warm textured color, expressive faces, clear shapes.";

export function createProject(input: { title: string; localAuthorCredit: string }): Project {
  const now = new Date().toISOString();
  const beats = beatTypes.map((type) => ({ id: randomUUID(), type, childText: "", panelIds: [] as string[] }));
  const panels = beats.map((beat, order) => {
    const id = randomUUID();
    beat.panelIds.push(id);
    return {
      id,
      beatId: beat.id,
      order,
      action: "",
      setting: "",
      mood: "",
      framing: "",
      overlays: [],
      imageVersions: [],
      generationStatus: "idle" as const,
    };
  });

  return ProjectSchema.parse({
    id: randomUUID(),
    schemaVersion: 1,
    title: input.title,
    localAuthorCredit: input.localAuthorCredit,
    createdAt: now,
    updatedAt: now,
    hero: { childDescription: "", imageVersions: [] },
    visualStyle: { presetId: "cartoon", baselineNotes: cartoonNotes, editedNotes: cartoonNotes },
    beats,
    panels,
  });
}
```

- [ ] **Step 5: Implement derived pagination and approval**

```ts
// src/domain/pagination.ts
export function paginatePanels<T extends { order: number }>(panels: readonly T[]): T[][] {
  const ordered = [...panels].sort((left, right) => left.order - right.order);
  return Array.from({ length: Math.ceil(ordered.length / 4) }, (_, page) =>
    ordered.slice(page * 4, page * 4 + 4),
  );
}
```

```ts
// src/domain/image-versions.ts
import type { Panel } from "./project";

export function approveImageVersion(panel: Panel, versionId: string): Panel {
  if (!panel.imageVersions.some((version) => version.id === versionId)) {
    throw new Error(`Unknown image version: ${versionId}`);
  }
  return {
    ...panel,
    approvedImageVersionId: versionId,
    imageVersions: panel.imageVersions.map((version) => ({
      ...version,
      status: version.id === versionId ? "approved" : version.status === "approved" ? "rejected" : version.status,
    })),
  };
}
```

```ts
// src/domain/api.ts
export type ApiErrorCode =
  | "missing_key"
  | "authentication"
  | "quota"
  | "rate_limit"
  | "network"
  | "safety"
  | "compiler_invariant"
  | "provider"
  | "storage"
  | "export";

export interface ApiErrorPayload {
  error: {
    code: ApiErrorCode;
    message: string;
    retryable: boolean;
    retryAfterMs?: number;
  };
}
```

```ts
// src/domain/panel-layout.ts
export const DEFAULT_DIALOGUE_BOX = { x: 0.06, y: 0.06, width: 0.48, height: 0.22 } as const;
export const DEFAULT_CAPTION_BOX = { x: 0.05, y: 0.78, width: 0.9, height: 0.16 } as const;
```

- [ ] **Step 6: Add focused test fixtures**

```ts
// tests/fixtures/project-fixtures.ts
import { createProject, type ImageVersion, type Panel } from "../../src/domain/project";

export function makeProject() {
  return createProject({ title: "Test Comic", localAuthorCredit: "T." });
}

export function makePanel(overrides: Partial<Panel> = {}): Panel {
  const panel = makeProject().panels[0]!;
  return { ...panel, ...overrides } as Panel;
}

export function makeImageVersion(overrides: Partial<ImageVersion> = {}): ImageVersion {
  return {
    id: "image-1",
    localPath: "images/image-1.png",
    createdAt: "2026-07-20T00:00:00.000Z",
    childRevisionDirection: "",
    status: "candidate",
    ...overrides,
  };
}

export function makeProjectWithDialogue(text: string) {
  const project = makeProject();
  project.panels[0]!.overlays = [{
    id: "dialogue-1",
    kind: "dialogue",
    text,
    x: 0.06,
    y: 0.06,
    width: 0.48,
    height: 0.22,
  }];
  return project;
}

export function makeEightPanelProject() {
  const project = makeProject();
  const ending = project.beats.find((beat) => beat.type === "ending")!;
  const source = project.panels.at(-1)!;
  const extra = Array.from({ length: 4 }, (_, index) => ({
    ...source,
    id: `extra-panel-${index + 1}`,
    order: index + 4,
    overlays: [],
    imageVersions: [],
  }));
  ending.panelIds.push(...extra.map((panel) => panel.id));
  project.panels.push(...extra);
  return project;
}
```

- [ ] **Step 7: Run domain validation**

Run: `npm test -- tests/domain && npm run typecheck`

Expected: all domain tests PASS; strict typecheck PASS.

- [ ] **Step 8: Commit the domain contract**

```bash
git add src/domain tests/domain tests/fixtures
git commit -m "feat: define comic project domain"
```

### Task 3: Prove the OpenAI direction and reference-image path

**Files:**
- Create: `src/server/config.ts`
- Create: `src/server/generation/contracts.ts`
- Create: `src/server/generation/prompt-builder.ts`
- Create: `src/server/generation/openai-provider.ts`
- Create: `src/server/generation/provider-errors.ts`
- Create: `scripts/smoke-openai.ts`
- Test: `tests/server/prompt-builder.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `RenderingChoicesSchema`, `RenderingChoices`
- Produces: `GenerationProvider.moderate(text)`
- Produces: `GenerationProvider.chooseRendering(input)`
- Produces: `GenerationProvider.generateHero(prompt)`
- Produces: `GenerationProvider.generatePanel(referencePath, prompt)`
- Produces: `buildImagePrompt(input, choices): string`
- Gate: live smoke must demonstrate acceptable latency and recognizable hero continuity before Task 4 begins

- [ ] **Step 1: Write failing tests that keep story facts deterministic**

```ts
// tests/server/prompt-builder.test.ts
import { describe, expect, it } from "vitest";
import { buildImagePrompt } from "../../src/server/generation/prompt-builder";

describe("buildImagePrompt", () => {
  it("includes child-authored facts exactly and adds only enumerated rendering choices", () => {
    const prompt = buildImagePrompt(
      {
        heroDescription: "Nova wears a violet flight jacket and round goggles.",
        action: "Nova pulls the moon kite away from the storm cloud.",
        setting: "A rooftop at night.",
        mood: "brave",
        framing: "show the whole kite",
        styleNotes: "Bold ink and textured color.",
        revisionDirection: "",
      },
      {
        shotSize: "wide",
        cameraAngle: "eye_level",
        lighting: "moonlit",
        palette: "cool",
        focus: "action",
      },
    );

    expect(prompt).toContain("Nova pulls the moon kite away from the storm cloud.");
    expect(prompt).toContain("A rooftop at night.");
    expect(prompt).not.toContain("dialogue");
    expect(prompt).not.toContain("caption");
  });
});
```

- [ ] **Step 2: Run the prompt test and verify it fails**

Run: `npm test -- tests/server/prompt-builder.test.ts`

Expected: FAIL because generation contracts do not exist.

- [ ] **Step 3: Define rendering-only structured output**

```ts
// src/server/generation/contracts.ts
import { z } from "zod";

export const RenderingChoicesSchema = z.object({
  shotSize: z.enum(["close", "medium", "wide"]),
  cameraAngle: z.enum(["eye_level", "low", "high"]),
  lighting: z.enum(["daylight", "golden", "moonlit", "dramatic"]),
  palette: z.enum(["warm", "cool", "bright", "muted"]),
  focus: z.enum(["hero", "action", "setting"]),
});

export type RenderingChoices = z.infer<typeof RenderingChoicesSchema>;

export interface VisualInput {
  heroDescription: string;
  action: string;
  setting: string;
  mood: string;
  framing: string;
  styleNotes: string;
  revisionDirection: string;
}

export interface GeneratedImage {
  bytes: Buffer;
  providerRequestId?: string;
  durationMs: number;
}

export interface GenerationProvider {
  moderate(text: string): Promise<void>;
  chooseRendering(input: VisualInput): Promise<RenderingChoices>;
  generateHero(prompt: string): Promise<GeneratedImage>;
  generatePanel(referencePath: string, prompt: string): Promise<GeneratedImage>;
}
```

The compiler selects only enums. Exact story fields are inserted by deterministic server code, so GPT-5.6 has no free-text channel in which to invent story events.

- [ ] **Step 4: Implement deterministic prompt composition**

```ts
// src/server/generation/prompt-builder.ts
import type { RenderingChoices, VisualInput } from "./contracts";

export function buildImagePrompt(input: VisualInput, choices: RenderingChoices): string {
  return [
    "Create one square comic panel with no written words, letters, captions, speech bubbles, logos, or watermarks.",
    `Hero continuity: ${input.heroDescription}`,
    `Child-authored action, preserve exactly: ${input.action}`,
    `Child-authored setting, preserve exactly: ${input.setting}`,
    `Mood: ${input.mood || "clear and expressive"}`,
    `Child framing request: ${input.framing || "show the action clearly"}`,
    `Art style: ${input.styleNotes}`,
    `Rendering choices: ${choices.shotSize} shot, ${choices.cameraAngle} angle, ${choices.lighting} lighting, ${choices.palette} palette, focus on ${choices.focus}.`,
    input.revisionDirection ? `Child-requested visual change: ${input.revisionDirection}` : "",
    "Do not add a new character, plot event, important prop, or story resolution.",
  ].filter(Boolean).join("\n");
}
```

- [ ] **Step 5: Implement environment parsing and the OpenAI provider**

```ts
// src/server/config.ts
import { z } from "zod";

const ConfigSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_TEXT_MODEL: z.string().default("gpt-5.6-luna"),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-2"),
  OPENAI_MODERATION_MODEL: z.string().default("omni-moderation-latest"),
  PORT: z.coerce.number().int().positive().default(4173),
  DATA_DIR: z.string().default("data"),
});

export type AppConfig = z.infer<typeof ConfigSchema>;
export function readConfig(environment = process.env): AppConfig {
  return ConfigSchema.parse(environment);
}
```

```ts
// src/server/generation/openai-provider.ts
import fs from "node:fs";
import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { AppConfig } from "../config";
import {
  RenderingChoicesSchema,
  type GeneratedImage,
  type GenerationProvider,
  type VisualInput,
} from "./contracts";

export class OpenAIGenerationProvider implements GenerationProvider {
  private readonly client: OpenAI;

  constructor(private readonly config: AppConfig) {
    if (!config.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
    this.client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }

  async moderate(text: string): Promise<void> {
    const response = await this.client.moderations.create({
      model: this.config.OPENAI_MODERATION_MODEL,
      input: text,
    });
    if (response.results[0]?.flagged) throw Object.assign(new Error("Safety check blocked the request"), { code: "safety" });
  }

  async chooseRendering(input: VisualInput) {
    const response = await this.client.responses.parse({
      model: this.config.OPENAI_TEXT_MODEL,
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content: "Choose only rendering parameters for a child-authored comic panel. Never rewrite or add story content.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
      text: { format: zodTextFormat(RenderingChoicesSchema, "rendering_choices") },
    });
    if (!response.output_parsed) throw new Error("No rendering choices returned");
    return RenderingChoicesSchema.parse(response.output_parsed);
  }

  async generateHero(prompt: string): Promise<GeneratedImage> {
    const started = performance.now();
    const response = await this.client.images.generate({
      model: this.config.OPENAI_IMAGE_MODEL,
      prompt,
      size: "1024x1024",
      quality: "medium",
    });
    const base64 = response.data[0]?.b64_json;
    if (!base64) throw new Error("Image response did not include data");
    return {
      bytes: Buffer.from(base64, "base64"),
      durationMs: Math.round(performance.now() - started),
      ...(response._request_id ? { providerRequestId: response._request_id } : {}),
    };
  }

  async generatePanel(referencePath: string, prompt: string): Promise<GeneratedImage> {
    const started = performance.now();
    const response = await this.client.images.edit({
      model: this.config.OPENAI_IMAGE_MODEL,
      image: await toFile(fs.createReadStream(referencePath), null, { type: "image/png" }),
      prompt,
      size: "1024x1024",
      quality: "medium",
    });
    const base64 = response.data[0]?.b64_json;
    if (!base64) throw new Error("Image response did not include data");
    return {
      bytes: Buffer.from(base64, "base64"),
      durationMs: Math.round(performance.now() - started),
      ...(response._request_id ? { providerRequestId: response._request_id } : {}),
    };
  }
}
```

- [ ] **Step 6: Add provider error normalization**

```ts
// src/server/generation/provider-errors.ts
import OpenAI from "openai";
import type { ApiErrorPayload } from "../../domain/api";

export function toApiError(error: unknown): ApiErrorPayload {
  if (error instanceof OpenAI.AuthenticationError) {
    return { error: { code: "authentication", message: "The local API key could not be used.", retryable: false } };
  }
  if (error instanceof OpenAI.APIError && error.code === "insufficient_quota") {
    return { error: { code: "quota", message: "This API project has no generation credit available.", retryable: false } };
  }
  if (error instanceof OpenAI.RateLimitError) {
    return { error: { code: "rate_limit", message: "The illustrator is busy. Try again shortly.", retryable: true, retryAfterMs: 5000 } };
  }
  if (error instanceof Error && "code" in error && error.code === "rate_limit") {
    return { error: { code: "rate_limit", message: "One illustration is already being drawn.", retryable: true, retryAfterMs: 1000 } };
  }
  if (error instanceof Error && "code" in error && error.code === "safety") {
    return { error: { code: "safety", message: "Try changing the visual direction.", retryable: false } };
  }
  if (error instanceof Error && "code" in error && error.code === "not_found") {
    return { error: { code: "storage", message: "That saved item could not be found.", retryable: false } };
  }
  return { error: { code: "provider", message: "The illustrator could not finish this version.", retryable: true } };
}
```

- [ ] **Step 7: Add the live feasibility script**

```ts
// scripts/smoke-openai.ts
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { readConfig } from "../src/server/config";
import { OpenAIGenerationProvider } from "../src/server/generation/openai-provider";
import { buildImagePrompt } from "../src/server/generation/prompt-builder";

const outputDir = path.resolve("tmp/openai-smoke");
await fs.mkdir(outputDir, { recursive: true });
const provider = new OpenAIGenerationProvider(readConfig());
const heroDescription = "Nova, a young fictional inventor with a violet flight jacket, round goggles, dark curly hair, and a silver moon-kite spool.";

await provider.moderate(heroDescription);
const hero = await provider.generateHero([
  "Create a square full-body comic character reference on a simple pale background.",
  heroDescription,
  "Bold ink outlines, warm textured color, expressive but not babyish. No text.",
].join("\n"));
const heroPath = path.join(outputDir, "hero.png");
await fs.writeFile(heroPath, hero.bytes);

const visualInput = {
  heroDescription,
  action: "Nova pulls the moon kite away from a storm cloud.",
  setting: "A city rooftop beneath a large moon.",
  mood: "brave and focused",
  framing: "show Nova and the full kite line",
  styleNotes: "Bold ink outlines, warm textured color, expressive faces, clear shapes.",
  revisionDirection: "",
};
await provider.moderate(Object.values(visualInput).join("\n"));
const choices = await provider.chooseRendering(visualInput);
const panel = await provider.generatePanel(heroPath, buildImagePrompt(visualInput, choices));
await fs.writeFile(path.join(outputDir, "panel.png"), panel.bytes);

console.log(JSON.stringify({
  heroDurationMs: hero.durationMs,
  panelDurationMs: panel.durationMs,
  heroPath,
  panelPath: path.join(outputDir, "panel.png"),
}, null, 2));
```

- [ ] **Step 8: Test the deterministic layer**

Run: `npm test -- tests/server/prompt-builder.test.ts && npm run typecheck`

Expected: tests PASS; typecheck PASS.

- [ ] **Step 9: Configure the key through the secure OpenAI Platform flow and run the live gate**

Use the OpenAI Platform secure local-key setup flow. Do not paste a key into chat or commit it.

Run: `npm run smoke:openai`

Expected:

- exits `0`;
- writes `tmp/openai-smoke/hero.png` and `panel.png`;
- hero duration is at most 60,000 ms;
- panel duration is at most 35,000 ms; and
- manual inspection confirms the panel visibly retains Nova’s violet jacket, round goggles, curly hair, and moon-kite spool.

If latency or recognizable continuity fails, stop before Task 4 and revise the reference-image request, output quality, or prompt. Record measured latency and the go/no-go result in `docs/STATE.md`; do not claim consistency from request success alone.

- [ ] **Step 10: Commit the proven generation boundary**

```bash
git add src/server/config.ts src/server/generation scripts/smoke-openai.ts tests/server/prompt-builder.test.ts .gitignore docs/STATE.md
git commit -m "feat: prove reference-guided comic generation"
```

### Task 4: Add atomic local persistence and deterministic sample mode

**Files:**
- Create: `src/server/storage/project-store.ts`
- Create: `src/server/storage/sample-provider.ts`
- Create: `src/server/routes/config-routes.ts`
- Create: `src/server/routes/project-routes.ts`
- Create: `scripts/build-sample-assets.ts`
- Create: `sample-assets/moon-kite/project.json`
- Create: `sample-assets/moon-kite/images/panel-1.png`
- Create: `sample-assets/moon-kite/images/panel-2.png`
- Create: `sample-assets/moon-kite/images/panel-3.png`
- Create: `sample-assets/moon-kite/images/panel-4.png`
- Modify: `src/server/app.ts`
- Test: `tests/server/project-store.test.ts`
- Test: `tests/server/project-routes.test.ts`

**Interfaces:**
- Produces: `ProjectStore.create`, `ProjectStore.load`, `ProjectStore.save`, `ProjectStore.assetPath`
- Produces: `SampleProvider.copyToProject(): Promise<Project>`
- Produces: `GET /api/config`
- Produces: `POST /api/projects`, `GET/PUT /api/projects/:id`, `POST /api/projects/sample`

- [ ] **Step 1: Write failing atomic-store tests**

```ts
// tests/server/project-store.test.ts
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ProjectStore } from "../../src/server/storage/project-store";
import { makeProject } from "../fixtures/project-fixtures";

const root = path.resolve("tmp", `project-store-test-${randomUUID()}`);

describe("ProjectStore", () => {
  it("round-trips a schema-valid project", async () => {
    const store = new ProjectStore(root);
    const project = makeProject();
    await store.save(project);
    expect(await store.load(project.id)).toEqual(project);
  });

  it("recovers from the rolling backup", async () => {
    const store = new ProjectStore(root);
    const project = makeProject();
    await store.save(project);
    await store.save({ ...project, title: "Second title", updatedAt: new Date().toISOString() });
    await fs.writeFile(path.join(root, "projects", project.id, "project.json"), "{broken");
    expect((await store.load(project.id)).title).toBe(project.title);
  });
});
```

The ignored, uniquely named `tmp/` test directory remains available for failure inspection. Task 8 removes captured verification directories with Trash after the evidence is recorded.

- [ ] **Step 2: Run the store tests and verify they fail**

Run: `npm test -- tests/server/project-store.test.ts`

Expected: FAIL because `ProjectStore` does not exist.

- [ ] **Step 3: Implement atomic persistence with one rolling backup**

```ts
// src/server/storage/project-store.ts
import fs from "node:fs/promises";
import path from "node:path";
import { ProjectSchema, type Project } from "../../domain/project";

export class ProjectStore {
  constructor(private readonly root: string) {}

  private projectDir(id: string) {
    if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Invalid project id");
    return path.join(this.root, "projects", id);
  }

  async save(project: Project): Promise<void> {
    const valid = ProjectSchema.parse(project);
    const directory = this.projectDir(valid.id);
    const current = path.join(directory, "project.json");
    const previous = path.join(directory, "project.previous.json");
    const temporary = path.join(directory, "project.tmp.json");
    await fs.mkdir(path.join(directory, "images"), { recursive: true });
    await fs.writeFile(temporary, `${JSON.stringify(valid, null, 2)}\n`, "utf8");
    try { await fs.copyFile(current, previous); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await fs.rename(temporary, current);
  }

  async load(id: string): Promise<Project> {
    const directory = this.projectDir(id);
    for (const filename of ["project.json", "project.previous.json"]) {
      try {
        return ProjectSchema.parse(JSON.parse(await fs.readFile(path.join(directory, filename), "utf8")));
      } catch {
        continue;
      }
    }
    throw Object.assign(new Error(`No valid project document for ${id}`), {
      code: "not_found",
    });
  }

  assetPath(projectId: string, imageId: string): string {
    if (!/^[a-zA-Z0-9-]+$/.test(imageId)) throw new Error("Invalid image id");
    return path.join(this.projectDir(projectId), "images", `${imageId}.png`);
  }
}
```

- [ ] **Step 4: Define the original sample fixture and renderer**

The tracked sample is “Nova and the Moon Kite”:

```ts
// scripts/build-sample-assets.ts
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ProjectSchema } from "../src/domain/project";

const panels = [
  { colors: ["#6e63ff", "#1b174b"], symbol: "N", accent: "#ffd55c" },
  { colors: ["#ffb866", "#682c55"], symbol: "!", accent: "#fffdf7" },
  { colors: ["#2d9d78", "#123e42"], symbol: "K", accent: "#ffe6bc" },
  { colors: ["#89d6ff", "#6f51d8"], symbol: "★", accent: "#fffdf7" },
];
const out = path.resolve("sample-assets/moon-kite/images");
await fs.mkdir(out, { recursive: true });

for (const [index, panel] of panels.entries()) {
  const svg = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="${panel.colors[0]}"/><stop offset="1" stop-color="${panel.colors[1]}"/>
      </linearGradient></defs>
      <rect width="1024" height="1024" fill="url(#g)"/>
      <circle cx="780" cy="230" r="150" fill="#fff4c7" opacity=".9"/>
      <path d="M160 820 C320 410 600 470 850 160" fill="none" stroke="${panel.accent}" stroke-width="28"/>
      <circle cx="350" cy="650" r="150" fill="#6f51d8" stroke="#202020" stroke-width="28"/>
      <circle cx="300" cy="560" r="24" fill="#202020"/><circle cx="400" cy="560" r="24" fill="#202020"/>
      <text x="350" y="700" text-anchor="middle" font-family="system-ui" font-size="100" font-weight="900" fill="#fff">${panel.symbol}</text>
    </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(out, `panel-${index + 1}.png`));
}

const beatDefinitions = [
  { id: "beat-setup", type: "setup", childText: "Nova tests her moon kite.", panelId: "panel-1" },
  { id: "beat-problem", type: "problem", childText: "A storm cloud catches it.", panelId: "panel-2" },
  { id: "beat-big-moment", type: "bigMoment", childText: "Nova climbs the tower and pulls it free.", panelId: "panel-3" },
  { id: "beat-ending", type: "ending", childText: "The kite lights the whole neighborhood.", panelId: "panel-4" },
] as const;
const dialogue = [
  "Tonight, I’ll touch the moon!",
  "Oh no—the wind has other plans!",
  "Hold on, little kite!",
  "We made our own moonlight.",
] as const;
const project = ProjectSchema.parse({
  id: "sample-moon-kite",
  schemaVersion: 1,
  title: "Nova and the Moon Kite",
  localAuthorCredit: "M.",
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
  hero: {
    childDescription: "Nova wears a violet flight jacket and round goggles and carries a silver moon-kite spool.",
    imageVersions: [],
  },
  visualStyle: {
    presetId: "cartoon",
    baselineNotes: "Bold ink outlines, warm textured color, expressive faces, clear shapes.",
    editedNotes: "Bold ink outlines, warm textured color, expressive faces, clear shapes.",
  },
  beats: beatDefinitions.map((beat) => ({
    id: beat.id,
    type: beat.type,
    childText: beat.childText,
    panelIds: [beat.panelId],
  })),
  panels: beatDefinitions.map((beat, index) => ({
    id: beat.panelId,
    beatId: beat.id,
    order: index,
    action: beat.childText,
    setting: index === 0 ? "Nova’s rooftop workshop at night." : "The city rooftops beneath the moon.",
    mood: ["hopeful", "worried", "brave", "joyful"][index],
    framing: "Show Nova, the kite, and the moon clearly.",
    overlays: [{
      id: `dialogue-${index + 1}`,
      kind: "dialogue",
      text: dialogue[index],
      speaker: "Nova",
      x: 0.06,
      y: 0.06,
      width: 0.48,
      height: 0.22,
    }],
    approvedImageVersionId: `sample-art-${index + 1}`,
    imageVersions: [{
      id: `sample-art-${index + 1}`,
      localPath: `images/panel-${index + 1}.png`,
      createdAt: "2026-07-20T00:00:00.000Z",
      childRevisionDirection: "",
      status: "approved",
    }],
    generationStatus: "idle",
  })),
});
await fs.writeFile(
  path.resolve("sample-assets/moon-kite/project.json"),
  `${JSON.stringify(project, null, 2)}\n`,
  "utf8",
);
```

Run: `npm run sample:build`

Expected: four 1024×1024 original PNG fixtures are created.

- [ ] **Step 5: Validate the generated sample project**

The asset script writes a stable, schema-validated `sample-assets/moon-kite/project.json`; IDs and timestamps do not change between runs. Validate the tracked result independently:

```ts
ProjectSchema.parse(JSON.parse(await fs.readFile("sample-assets/moon-kite/project.json", "utf8")));
```

- [ ] **Step 6: Implement sample copy and project routes**

```ts
// src/server/storage/sample-provider.ts
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ProjectSchema, type Project } from "../../domain/project";
import { ProjectStore } from "./project-store";

export class SampleProvider {
  constructor(private readonly fixtureRoot: string, private readonly store: ProjectStore) {}

  async copyToProject(): Promise<Project> {
    const fixture = ProjectSchema.parse(JSON.parse(await fs.readFile(path.join(this.fixtureRoot, "project.json"), "utf8")));
    const id = randomUUID();
    const now = new Date().toISOString();
    const project = { ...fixture, id, createdAt: now, updatedAt: now };
    await this.store.save(project);
    for (const panel of project.panels) {
      for (const version of panel.imageVersions) {
        const source = path.join(this.fixtureRoot, "images", path.basename(version.localPath));
        const target = this.store.assetPath(id, version.id);
        await fs.copyFile(source, target);
        version.localPath = `images/${version.id}.png`;
      }
    }
    await this.store.save(project);
    return project;
  }
}
```

Register routes with dependency injection:

```ts
// src/server/routes/project-routes.ts
import { Router } from "express";
import { createProject, ProjectSchema } from "../../domain/project";
import type { ProjectStore } from "../storage/project-store";
import type { SampleProvider } from "../storage/sample-provider";

export function createProjectRouter(store: ProjectStore, sampleProvider: SampleProvider) {
  const router = Router();
  router.post("/projects", async (request, response) => {
    const project = createProject(request.body);
    await store.save(project);
    response.status(201).json(project);
  });
  router.get("/projects/:id", async (request, response) => {
    response.json(await store.load(request.params.id));
  });
  router.put("/projects/:id", async (request, response) => {
    const project = ProjectSchema.parse(request.body);
    if (project.id !== request.params.id) {
      response.status(400).json({ error: { code: "storage", message: "Project id mismatch", retryable: false } });
      return;
    }
    const updated = { ...project, updatedAt: new Date().toISOString() };
    await store.save(updated);
    response.json(updated);
  });
  router.post("/projects/sample", async (_request, response) => {
    response.status(201).json(await sampleProvider.copyToProject());
  });
  return router;
}
```

```ts
// src/server/routes/config-routes.ts
import { Router } from "express";
import type { AppConfig } from "../config";

export function createConfigRouter(config: AppConfig) {
  const router = Router();
  router.get("/config", (_request, response) => {
    response.json({ generationEnabled: Boolean(config.OPENAI_API_KEY) });
  });
  return router;
}
```

Update the application factory without changing the zero-argument health-test contract:

```ts
// src/server/app.ts
import express, { type Express } from "express";
import path from "node:path";
import { ZodError } from "zod";
import { readConfig, type AppConfig } from "./config";
import { createConfigRouter } from "./routes/config-routes";
import { createProjectRouter } from "./routes/project-routes";
import { ProjectStore } from "./storage/project-store";
import { SampleProvider } from "./storage/sample-provider";

export interface AppDependencies {
  config: AppConfig;
  store: ProjectStore;
  sampleProvider: SampleProvider;
}

function defaultDependencies(): AppDependencies {
  const config = readConfig();
  const store = new ProjectStore(path.resolve(config.DATA_DIR));
  return {
    config,
    store,
    sampleProvider: new SampleProvider(path.resolve("sample-assets/moon-kite"), store),
  };
}

export function createApp(dependencies: AppDependencies = defaultDependencies()): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (_request, response) => response.json({ ok: true }));
  app.use("/api", createConfigRouter(dependencies.config));
  app.use("/api", createProjectRouter(dependencies.store, dependencies.sampleProvider));
  app.use((
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    const missing = error instanceof Error && "code" in error && error.code === "not_found";
    const invalid = error instanceof ZodError;
    response.status(missing ? 404 : invalid ? 400 : 500).json({
      error: {
        code: "storage",
        message: missing
          ? "That saved project could not be found."
          : invalid
            ? "The project data needs to be corrected."
            : "The local project could not be saved.",
        retryable: !missing && !invalid,
      },
    });
  });
  return app;
}
```

- [ ] **Step 7: Test sample mode and persistence routes**

```ts
// tests/server/project-routes.test.ts
import express from "express";
import path from "node:path";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createProjectRouter } from "../../src/server/routes/project-routes";
import { ProjectStore } from "../../src/server/storage/project-store";
import { SampleProvider } from "../../src/server/storage/sample-provider";

it("copies the sample without configuring or calling OpenAI", async () => {
  const store = new ProjectStore(path.resolve("tmp", `sample-route-${randomUUID()}`));
  const sample = new SampleProvider(path.resolve("sample-assets/moon-kite"), store);
  const app = express();
  app.use(express.json());
  app.use("/api", createProjectRouter(store, sample));

  const response = await request(app).post("/api/projects/sample");
  expect(response.status).toBe(201);
  expect(response.body.title).toBe("Nova and the Moon Kite");
  expect(response.body.panels).toHaveLength(4);
});
```

Run: `npm test -- tests/server/project-store.test.ts tests/server/project-routes.test.ts`

Expected: PASS, including an assertion that `POST /api/projects/sample` succeeds when `OPENAI_API_KEY` is absent and no generation provider method is called.

- [ ] **Step 8: Commit local persistence and sample mode**

```bash
git add src/server/storage src/server/routes src/server/app.ts scripts/build-sample-assets.ts sample-assets tests/server
git commit -m "feat: add local projects and sample mode"
```

### Task 5: Build the child-facing hero, style, and story workflow

**Files:**
- Create: `src/client/api/client.ts`
- Create: `src/client/state/use-project.ts`
- Create: `src/client/components/AppFrame.tsx`
- Create: `src/client/components/StatusNotice.tsx`
- Create: `src/client/features/launch/LaunchScreen.tsx`
- Create: `src/client/features/hero/HeroWorkshop.tsx`
- Create: `src/client/features/style/StylePicker.tsx`
- Create: `src/client/features/story/StorySpine.tsx`
- Modify: `src/client/App.tsx`
- Modify: `src/client/styles/tokens.css`
- Modify: `src/client/styles/app.css`
- Test: `tests/client/launch.test.tsx`
- Test: `tests/client/style-picker.test.tsx`
- Test: `tests/client/story-spine.test.tsx`

**Interfaces:**
- Consumes: project and config HTTP routes from Task 4
- Produces: `ComicApi`
- Produces: `useProject(projectId)` with debounced autosave
- Produces: steps `hero -> style -> story -> panels -> premiere`

- [ ] **Step 1: Write failing child-flow tests**

```tsx
// tests/client/story-spine.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StorySpine } from "../../src/client/features/story/StorySpine";
import { makeProject } from "../fixtures/project-fixtures";

it("keeps every beat child-authored", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<StorySpine project={makeProject()} onChange={onChange} />);
  await user.type(screen.getByLabelText("Setup"), "Nova tests her moon kite.");
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
    beats: expect.arrayContaining([expect.objectContaining({ type: "setup", childText: "Nova tests her moon kite." })]),
  }));
});
```

```tsx
// tests/client/style-picker.test.tsx
it("restores the preset baseline without changing system rules", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<StylePicker value={{ presetId: "manga", baselineNotes: "Crisp manga ink.", editedNotes: "Soft pencil." }} onChange={onChange} />);
  await user.click(screen.getByRole("button", { name: "Reset style notes" }));
  expect(onChange).toHaveBeenCalledWith({ presetId: "manga", baselineNotes: "Crisp manga ink.", editedNotes: "Crisp manga ink." });
});
```

- [ ] **Step 2: Run the client tests and verify they fail**

Run: `npm test -- tests/client/story-spine.test.tsx tests/client/style-picker.test.tsx`

Expected: FAIL because the child-facing features do not exist.

- [ ] **Step 3: Implement the typed API and autosave hook**

```ts
// src/client/api/client.ts
import { ProjectSchema, type Project } from "../../domain/project";
import type { ApiErrorPayload } from "../../domain/api";

export class ComicApiError extends Error {
  constructor(readonly payload: ApiErrorPayload["error"]) { super(payload.message); }
}

async function decode<T>(response: Response, parse: (value: unknown) => T): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new ComicApiError((body as ApiErrorPayload).error);
  return parse(body);
}

export const comicApi = {
  config: () => fetch("/api/config").then((response) => decode(response, (value) => value as { generationEnabled: boolean })),
  createProject: (input: { title: string; localAuthorCredit: string }) =>
    fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })
      .then((response) => decode(response, ProjectSchema.parse)),
  copySample: () => fetch("/api/projects/sample", { method: "POST" }).then((response) => decode(response, ProjectSchema.parse)),
  loadProject: (id: string) => fetch(`/api/projects/${id}`).then((response) => decode(response, ProjectSchema.parse)),
  saveProject: (project: Project) =>
    fetch(`/api/projects/${project.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(project) })
      .then((response) => decode(response, ProjectSchema.parse)),
};
```

`useProject` must:

- load the selected project once;
- expose `update(mutator)` using functional state;
- debounce saves by 500 ms;
- flush the latest save before `pagehide`; and
- show a local “Saved” indicator only after the server confirms.

```ts
// src/client/state/use-project.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "../../domain/project";
import { comicApi } from "../api/client";

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project>();
  const [saveState, setSaveState] = useState<"loading" | "dirty" | "saving" | "saved" | "error">("loading");
  const latest = useRef<Project | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void comicApi.loadProject(projectId).then((loaded) => {
      if (!active) return;
      latest.current = loaded;
      setProject(loaded);
      setSaveState("saved");
    }).catch(() => active && setSaveState("error"));
    return () => { active = false; };
  }, [projectId]);

  const queueSave = useCallback((next: Project) => {
    latest.current = next;
    if (timer.current) clearTimeout(timer.current);
    setSaveState("dirty");
    timer.current = setTimeout(() => {
      setSaveState("saving");
      void comicApi.saveProject(next)
        .then((saved) => {
          latest.current = saved;
          setProject(saved);
          setSaveState("saved");
        })
        .catch(() => setSaveState("error"));
    }, 500);
  }, []);

  const update = useCallback((mutator: (current: Project) => Project) => {
    setProject((current) => {
      if (!current) return current;
      const next = mutator(current);
      queueSave(next);
      return next;
    });
  }, [queueSave]);

  useEffect(() => {
    const flush = () => {
      if (!latest.current || saveState === "saved") return;
      void fetch(`/api/projects/${latest.current.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(latest.current),
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [saveState]);

  return { project, saveState, update };
}
```

- [ ] **Step 4: Implement style presets and the four beat cards**

```ts
// src/client/features/style/StylePicker.tsx
import type { Project } from "../../../domain/project";

const PRESETS = {
  cartoon: "Bold ink outlines, warm textured color, expressive faces, clear shapes.",
  manga: "Crisp manga ink, dynamic motion, expressive eyes, selective color.",
  superhero: "Strong shadows, dramatic perspective, saturated heroic color, bold anatomy.",
} as const;

type Style = Project["visualStyle"];
export function StylePicker({ value, onChange }: { value: Style; onChange: (value: Style) => void }) {
  const select = (presetId: keyof typeof PRESETS) =>
    onChange({ presetId, baselineNotes: PRESETS[presetId], editedNotes: PRESETS[presetId] });
  return (
    <section aria-labelledby="style-title">
      <h2 id="style-title">Choose your comic’s look</h2>
      <div className="choice-grid">
        {Object.keys(PRESETS).map((id) => (
          <button key={id} aria-pressed={value.presetId === id} onClick={() => select(id as keyof typeof PRESETS)}>
            {id[0]!.toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>
      <label>Style notes<textarea value={value.editedNotes} onChange={(event) => onChange({ ...value, editedNotes: event.target.value })} /></label>
      <button onClick={() => onChange({ ...value, editedNotes: value.baselineNotes })}>Reset style notes</button>
    </section>
  );
}
```

```tsx
// src/client/features/story/StorySpine.tsx
import type { Project } from "../../../domain/project";

const labels = { setup: "Setup", problem: "Problem", bigMoment: "Big Moment", ending: "Ending" } as const;
const hints = {
  setup: "Who is the hero, and where are they?",
  problem: "What goes wrong?",
  bigMoment: "What is the most important action or choice?",
  ending: "How does it finish?",
} as const;

export function StorySpine({ project, onChange }: { project: Project; onChange: (project: Project) => void }) {
  return (
    <section aria-labelledby="story-title">
      <h2 id="story-title">Build your story</h2>
      <div className="beat-grid">
        {project.beats.map((beat) => (
          <label key={beat.id} className={`beat-card beat-${beat.type}`}>
            <strong>{labels[beat.type]}</strong><span>{hints[beat.type]}</span>
            <textarea
              aria-label={labels[beat.type]}
              value={beat.childText}
              onChange={(event) => onChange({
                ...project,
                beats: project.beats.map((item) => item.id === beat.id ? { ...item, childText: event.target.value } : item),
              })}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Compose launch, frame, hero description, and step navigation**

`LaunchScreen` offers exactly two actions:

- `Start a new comic` asks for title and optional local author credit, then calls `createProject`;
- `Explore the sample` calls `copySample`.

`HeroWorkshop` contains the hero description field and a disabled generation button when `generationEnabled` is false. It must not render the API key or an API-key input.

`AppFrame` shows:

- current comic title;
- step names `Hero`, `Style`, `Story`, `Panels`, `Premiere`;
- save state; and
- a persistent `Sample mode` notice when generation is disabled.

- [ ] **Step 6: Apply the approved responsive visual language**

Implement:

- maximum content width 1100 px;
- minimum body text 16 px;
- minimum interactive target 44×44 px;
- thick 3 px ink borders;
- card shadow `6px 6px 0 #202020`;
- two-column beat grid above 760 px and one column below;
- no low-contrast gray text on dark surfaces;
- `prefers-reduced-motion` removes progress and card transitions.

- [ ] **Step 7: Run client checks**

Run: `npm test -- tests/client && npm run typecheck && npm run build`

Expected: launch, style reset, and exact beat authoring tests PASS; typecheck and build PASS.

- [ ] **Step 8: Commit the story setup experience**

```bash
git add src/client tests/client
git commit -m "feat: add hero style and story setup"
```

### Task 6: Implement panel generation, exact overlays, and version approval

**Files:**
- Create: `src/server/generation/generation-service.ts`
- Create: `src/server/routes/generation-routes.ts`
- Create: `src/client/features/panels/PanelWorkshop.tsx`
- Create: `src/client/features/panels/PanelCanvas.tsx`
- Create: `src/client/features/panels/ImageVersionChooser.tsx`
- Modify: `src/client/api/client.ts`
- Modify: `src/client/App.tsx`
- Modify: `src/server/app.ts`
- Create: `tests/fixtures/generation-fixtures.ts`
- Test: `tests/server/generation-service.test.ts`
- Test: `tests/server/generation-routes.test.ts`
- Test: `tests/client/panel-workshop.test.tsx`

**Interfaces:**
- Consumes: `GenerationProvider`, `ProjectStore`, `approveImageVersion`
- Produces: `GenerationService.generateHero`, `generatePanel`, `approveHero`, `approvePanelVersion`
- Produces: hero and panel generation/approval API routes
- Produces: guided active-panel UI with quick-change chips and free-text direction

- [ ] **Step 1: Write failing non-destructive generation tests**

```ts
// tests/fixtures/generation-fixtures.ts
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Project } from "../../src/domain/project";
import type {
  GeneratedImage,
  GenerationProvider,
  RenderingChoices,
  VisualInput,
} from "../../src/server/generation/contracts";
import { GenerationService } from "../../src/server/generation/generation-service";
import { ProjectStore } from "../../src/server/storage/project-store";
import { makeImageVersion, makeProject } from "./project-fixtures";

export class RecordingProvider implements GenerationProvider {
  readonly recorded: string[] = [];
  constructor(private readonly generatedBytes = Buffer.from("generated-image")) {}
  async moderate(text: string) { this.recorded.push(text); }
  async chooseRendering(input: VisualInput): Promise<RenderingChoices> {
    this.recorded.push(JSON.stringify(input));
    return {
      shotSize: "wide",
      cameraAngle: "eye_level",
      lighting: "moonlit",
      palette: "cool",
      focus: "action",
    };
  }
  async generateHero(prompt: string): Promise<GeneratedImage> {
    this.recorded.push(prompt);
    return { bytes: this.generatedBytes, durationMs: 1 };
  }
  async generatePanel(_referencePath: string, prompt: string): Promise<GeneratedImage> {
    this.recorded.push(prompt);
    return { bytes: this.generatedBytes, durationMs: 1 };
  }
}

export function makeProjectWithApprovedPanel(): Project {
  const project = makeProject();
  project.hero = {
    ...project.hero,
    childDescription: "Nova wears a violet jacket and round goggles.",
    approvedReferenceImageId: "hero-approved",
    imageVersions: [
      makeImageVersion({
        id: "hero-approved",
        localPath: "images/hero-approved.png",
        status: "approved",
      }),
    ],
  };
  project.panels[0] = {
    ...project.panels[0]!,
    action: "Nova launches the moon kite.",
    setting: "A rooftop at night.",
    approvedImageVersionId: "approved-old",
    imageVersions: [
      makeImageVersion({
        id: "approved-old",
        localPath: "images/approved-old.png",
        status: "approved",
      }),
    ],
  };
  return project;
}

export async function createGenerationHarness(
  project: Project,
  provider = new RecordingProvider(),
) {
  const store = new ProjectStore(path.resolve("tmp", `generation-${randomUUID()}`));
  await store.save(project);
  if (project.hero.approvedReferenceImageId) {
    await fs.writeFile(
      store.assetPath(project.id, project.hero.approvedReferenceImageId),
      Buffer.from("reference-image"),
    );
  }
  return { provider, store, service: new GenerationService(store, provider) };
}
```

```ts
// tests/server/generation-service.test.ts
import { expect, it } from "vitest";
import {
  createGenerationHarness,
  makeProjectWithApprovedPanel,
  RecordingProvider,
} from "../fixtures/generation-fixtures";

it("adds a panel candidate without replacing the approved image", async () => {
  const project = makeProjectWithApprovedPanel();
  const { service } = await createGenerationHarness(project);
  const updated = await service.generatePanel(project.id, project.panels[0]!.id, "Make it moonlit");
  expect(updated.approvedImageVersionId).toBe("approved-old");
  expect(updated.imageVersions.at(-1)?.status).toBe("candidate");
  expect(updated.imageVersions).toHaveLength(2);
});

it("never sends dialogue or author credit to the provider", async () => {
  const provider = new RecordingProvider();
  const project = makeProjectWithApprovedPanel();
  project.localAuthorCredit = "Local Name";
  project.panels[0]!.overlays = [{
    id: "dialogue",
    kind: "dialogue",
    text: "Exact child words",
    x: 0.06,
    y: 0.06,
    width: 0.48,
    height: 0.22,
  }];
  const { service } = await createGenerationHarness(project, provider);
  await service.generatePanel(project.id, project.panels[0]!.id, "");
  expect(provider.recorded.join("\n")).not.toContain("Exact child words");
  expect(provider.recorded.join("\n")).not.toContain("Local Name");
});
```

- [ ] **Step 2: Run generation tests and verify they fail**

Run: `npm test -- tests/server/generation-service.test.ts`

Expected: FAIL because `GenerationService` does not exist.

- [ ] **Step 3: Implement the per-project generation lock and service**

```ts
// src/server/generation/generation-service.ts
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { approveImageVersion } from "../../domain/image-versions";
import type { Project } from "../../domain/project";
import { ProjectStore } from "../storage/project-store";
import type { GenerationProvider, VisualInput } from "./contracts";
import { buildImagePrompt } from "./prompt-builder";

export class GenerationService {
  private readonly active = new Set<string>();
  constructor(private readonly store: ProjectStore, private readonly provider: GenerationProvider) {}

  private async exclusive<T>(projectId: string, work: () => Promise<T>): Promise<T> {
    if (this.active.has(projectId)) throw Object.assign(new Error("Generation already active"), { code: "rate_limit" });
    this.active.add(projectId);
    try { return await work(); } finally { this.active.delete(projectId); }
  }

  async generatePanel(projectId: string, panelId: string, revisionDirection: string) {
    return this.exclusive(projectId, async () => {
      const project = await this.store.load(projectId);
      const panel = project.panels.find((item) => item.id === panelId);
      if (!panel) throw Object.assign(new Error("Panel not found"), { code: "not_found" });
      const referenceId = project.hero.approvedReferenceImageId;
      if (!referenceId) throw new Error("Approve a hero before drawing panels");

      const visualInput: VisualInput = {
        heroDescription: project.hero.childDescription,
        action: panel.action,
        setting: panel.setting,
        mood: panel.mood,
        framing: panel.framing,
        styleNotes: project.visualStyle.editedNotes,
        revisionDirection,
      };
      await this.provider.moderate(Object.values(visualInput).join("\n"));
      const choices = await this.provider.chooseRendering(visualInput);
      const generated = await this.provider.generatePanel(
        this.store.assetPath(project.id, referenceId),
        buildImagePrompt(visualInput, choices),
      );
      const id = randomUUID();
      await fs.writeFile(this.store.assetPath(project.id, id), generated.bytes);
      const updatedPanel = {
        ...panel,
        generationStatus: "idle" as const,
        imageVersions: [...panel.imageVersions, {
          id,
          localPath: `images/${id}.png`,
          createdAt: new Date().toISOString(),
          sourceReferenceImageId: referenceId,
          ...(generated.providerRequestId ? { providerRequestId: generated.providerRequestId } : {}),
          durationMs: generated.durationMs,
          childRevisionDirection: revisionDirection,
          status: "candidate" as const,
        }],
      };
      const updated: Project = { ...project, panels: project.panels.map((item) => item.id === panel.id ? updatedPanel : item) };
      await this.store.save(updated);
      return updatedPanel;
    });
  }

  async approvePanelVersion(projectId: string, panelId: string, versionId: string) {
    const project = await this.store.load(projectId);
    const panel = project.panels.find((item) => item.id === panelId);
    if (!panel) throw Object.assign(new Error("Panel not found"), { code: "not_found" });
    if (!panel.imageVersions.some((version) => version.id === versionId)) {
      throw Object.assign(new Error("Panel image not found"), { code: "not_found" });
    }
    const approved = approveImageVersion(panel, versionId);
    await this.store.save({ ...project, panels: project.panels.map((item) => item.id === panelId ? approved : item) });
    return approved;
  }

  async generateHero(projectId: string) {
    return this.exclusive(projectId, async () => {
      const project = await this.store.load(projectId);
      const visualText = [project.hero.childDescription, project.visualStyle.editedNotes].join("\n");
      await this.provider.moderate(visualText);
      const generated = await this.provider.generateHero([
        "Create one square full-body comic character reference on a plain pale background.",
        `Child-authored hero, preserve exactly: ${project.hero.childDescription}`,
        `Art style: ${project.visualStyle.editedNotes}`,
        "No text, letters, logo, watermark, new character, plot event, or story setting.",
      ].join("\n"));
      const id = randomUUID();
      await fs.writeFile(this.store.assetPath(project.id, id), generated.bytes);
      const candidate = {
        id,
        localPath: `images/${id}.png`,
        createdAt: new Date().toISOString(),
        ...(generated.providerRequestId ? { providerRequestId: generated.providerRequestId } : {}),
        durationMs: generated.durationMs,
        childRevisionDirection: "",
        status: "candidate" as const,
      };
      const updated: Project = {
        ...project,
        hero: { ...project.hero, imageVersions: [...project.hero.imageVersions, candidate] },
      };
      await this.store.save(updated);
      return updated.hero;
    });
  }

  async approveHero(projectId: string, imageId: string) {
    const project = await this.store.load(projectId);
    if (!project.hero.imageVersions.some((version) => version.id === imageId)) {
      throw Object.assign(new Error("Hero image not found"), { code: "not_found" });
    }
    const changed = Boolean(
      project.hero.approvedReferenceImageId
      && project.hero.approvedReferenceImageId !== imageId,
    );
    const hero = {
      ...project.hero,
      approvedReferenceImageId: imageId,
      imageVersions: project.hero.imageVersions.map((version) => ({
        ...version,
        status: version.id === imageId
          ? "approved" as const
          : version.status === "approved"
            ? "rejected" as const
            : version.status,
      })),
    };
    await this.store.save({ ...project, hero });
    return { hero, hero_reference_changed: changed };
  }
}
```

The hero methods preserve every version, keep candidates non-destructive, and report `hero_reference_changed: true` only when an explicit approval replaces an older reference. The client uses that signal to warn that already-generated panels remain unchanged while future panels follow the new reference.

- [ ] **Step 4: Add generation and approval routes**

```ts
// src/server/routes/generation-routes.ts
import { Router } from "express";
import type { GenerationService } from "../generation/generation-service";
import { toApiError } from "../generation/provider-errors";
import type { ProjectStore } from "../storage/project-store";

export function createGenerationRouter(service: GenerationService, store: ProjectStore) {
  const router = Router();
  const fail = (response: import("express").Response, error: unknown) => {
    const payload = toApiError(error);
    const sourceCode = error instanceof Error && "code" in error ? error.code : undefined;
    const status = sourceCode === "not_found" ? 404
      : payload.error.code === "rate_limit" ? 429
      : payload.error.code === "authentication" ? 401
      : payload.error.code === "safety" ? 400
      : 502;
    response.status(status).set("cache-control", "no-store").json(payload);
  };

  router.post("/projects/:projectId/hero/generate", async (request, response) => {
    try {
      response.status(201).set("cache-control", "no-store")
        .json(await service.generateHero(request.params.projectId));
    } catch (error) { fail(response, error); }
  });
  router.post("/projects/:projectId/hero/:imageId/approve", async (request, response) => {
    try {
      response.set("cache-control", "no-store")
        .json(await service.approveHero(request.params.projectId, request.params.imageId));
    } catch (error) { fail(response, error); }
  });
  router.post("/projects/:projectId/panels/:panelId/generate", async (request, response) => {
    try {
      response.status(201).set("cache-control", "no-store").json(
        await service.generatePanel(
          request.params.projectId,
          request.params.panelId,
          String(request.body.revisionDirection ?? ""),
        ),
      );
    } catch (error) { fail(response, error); }
  });
  router.post("/projects/:projectId/panels/:panelId/versions/:versionId/approve", async (request, response) => {
    try {
      response.set("cache-control", "no-store").json(
        await service.approvePanelVersion(
          request.params.projectId,
          request.params.panelId,
          request.params.versionId,
        ),
      );
    } catch (error) { fail(response, error); }
  });
  router.get("/projects/:projectId/images/:imageId", async (request, response) => {
    try {
      const project = await store.load(request.params.projectId);
      const known = project.hero.imageVersions.some((version) => version.id === request.params.imageId)
        || project.panels.some((panel) => panel.imageVersions.some((version) => version.id === request.params.imageId));
      if (!known) {
        response.status(404).json({ error: { code: "storage", message: "Image not found", retryable: false } });
        return;
      }
      response.set("cache-control", "no-store")
        .sendFile(store.assetPath(project.id, request.params.imageId));
    } catch (error) { fail(response, error); }
  });
  return router;
}
```

Extend `AppDependencies` with `generationService?: GenerationService`. In
`defaultDependencies`, create it only when the local key exists:

```ts
const generationService = config.OPENAI_API_KEY
  ? new GenerationService(store, new OpenAIGenerationProvider(config))
  : undefined;
return {
  config,
  store,
  sampleProvider: new SampleProvider(path.resolve("sample-assets/moon-kite"), store),
  ...(generationService ? { generationService } : {}),
};
```

Register the router before the Task 4 error middleware:

```ts
if (dependencies.generationService) {
  app.use(
    "/api",
    createGenerationRouter(dependencies.generationService, dependencies.store),
  );
}
```

Every route:

- loads IDs from path parameters;
- returns `404` for unknown project/panel/image;
- converts provider errors through `toApiError`;
- stores only relative asset keys such as `images/<id>.png` in project JSON and never returns an absolute filesystem path;
- serves images through the validated image route; and
- sets `Cache-Control: no-store`.

- [ ] **Step 5: Implement the exact text overlay canvas**

```tsx
// src/client/features/panels/PanelCanvas.tsx
import type { Panel } from "../../../domain/project";

export function PanelCanvas({ panel, imageUrl, onOverlayChange }: {
  panel: Panel;
  imageUrl?: string;
  onOverlayChange: (id: string, text: string) => void;
}) {
  return (
    <div className="panel-canvas" aria-label={`Panel ${panel.order + 1} preview`}>
      {imageUrl ? <img src={imageUrl} alt="" /> : <div className="panel-empty">Your artwork will appear here</div>}
      {panel.overlays.map((overlay) => (
        <label
          key={overlay.id}
          className={`text-overlay ${overlay.kind}`}
          style={{
            left: `${overlay.x * 100}%`,
            top: `${overlay.y * 100}%`,
            width: `${overlay.width * 100}%`,
            minHeight: `${overlay.height * 100}%`,
          }}
        >
          <span className="sr-only">{overlay.kind === "dialogue" ? "Dialogue" : "Caption"}</span>
          <textarea value={overlay.text} onChange={(event) => onOverlayChange(overlay.id, event.target.value)} />
        </label>
      ))}
    </div>
  );
}
```

The image `alt` remains empty because exact dialogue/caption text and a nearby panel summary provide the accessible content. Do not duplicate generated visual guesses as alt text.

- [ ] **Step 6: Implement guided redirection and candidate approval**

`PanelWorkshop` shows:

- beat name and `Panel N of M`;
- large `PanelCanvas`;
- fields `What happens?`, `Where are they?`, `Mood`, `Camera`;
- `Add dialogue` and `Add caption`;
- quick chips `Closer`, `Wider`, `More expressive`, `Night`, `Day`, `Warmer`, `Cooler`;
- custom field `Tell your illustrator what to change`;
- `Draw my panel` or `Re-draw panel`; and
- previous/next navigation.

`ImageVersionChooser` shows the approved image and newest candidate side-by-side with:

- `Keep current`;
- `Use this version`;
- the child’s revision direction; and
- no automatic selection.

- [ ] **Step 7: Test exact text and failure preservation**

Run: `npm test -- tests/server/generation-service.test.ts tests/server/generation-routes.test.ts tests/client/panel-workshop.test.tsx`

Expected:

- exact dialogue survives save and regeneration;
- provider requests omit dialogue and local author credit;
- failed generation leaves approved image ID unchanged;
- candidate approval changes only explicit status fields; and
- double generation returns a retryable busy error.

- [ ] **Step 8: Commit the complete panel workshop**

```bash
git add src/server/generation/generation-service.ts src/server/routes/generation-routes.ts src/server/app.ts src/client tests/server/generation-service.test.ts tests/server/generation-routes.test.ts tests/client/panel-workshop.test.tsx
git commit -m "feat: add guided panel illustration"
```

### Task 7: Add comic pagination and printable PDF export

**Files:**
- Create: `src/client/features/comic/ComicPreview.tsx`
- Create: `src/server/export/pdf-layout.ts`
- Create: `src/server/export/pdf-renderer.ts`
- Create: `src/server/routes/export-routes.ts`
- Modify: `src/client/api/client.ts`
- Modify: `src/client/App.tsx`
- Modify: `src/server/app.ts`
- Test: `tests/client/comic-preview.test.tsx`
- Test: `tests/server/pdf-renderer.test.ts`
- Test: `tests/server/export-routes.test.ts`

**Interfaces:**
- Consumes: `paginatePanels`, approved image route, normalized overlay geometry
- Produces: `ComicPreview`
- Produces: `buildPdfLayout(project): PdfPageLayout[]`
- Produces: `renderComicPdf(project, resolveImage): Promise<Uint8Array>`
- Produces: `GET /api/projects/:id/export.pdf`

- [ ] **Step 1: Write failing pagination and exact-text export tests**

```tsx
// tests/client/comic-preview.test.tsx
import { render, screen } from "@testing-library/react";
import { ComicPreview } from "../../src/client/features/comic/ComicPreview";
import { makeEightPanelProject } from "../fixtures/project-fixtures";

it("renders panels five through eight on a second page", () => {
  render(<ComicPreview project={makeEightPanelProject()} imageUrl={() => "/test-image.png"} />);
  expect(screen.getAllByRole("article", { name: /Comic page/ })).toHaveLength(2);
});
```

```ts
// tests/server/pdf-renderer.test.ts
import fs from "node:fs/promises";
import { expect, it } from "vitest";
import { buildPdfLayout } from "../../src/server/export/pdf-layout";
import { renderComicPdf } from "../../src/server/export/pdf-renderer";
import { makeProjectWithDialogue } from "../fixtures/project-fixtures";

it("preserves exact dialogue in layout commands and emits a valid PDF", async () => {
  const project = makeProjectWithDialogue("We made our own moonlight.");
  const textCommands = buildPdfLayout(project)
    .flatMap((page) => page.panels)
    .flatMap((panel) => panel.overlays)
    .map((overlay) => overlay.text);
  expect(textCommands).toContain("We made our own moonlight.");
  const png = await fs.readFile("sample-assets/moon-kite/images/panel-1.png");
  const bytes = await renderComicPdf(project, async () => png);
  expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
});
```

- [ ] **Step 2: Run export tests and verify they fail**

Run: `npm test -- tests/client/comic-preview.test.tsx tests/server/pdf-renderer.test.ts`

Expected: FAIL because preview and PDF renderer do not exist.

- [ ] **Step 3: Implement the shared four-panel page composition**

```tsx
// src/client/features/comic/ComicPreview.tsx
import type { Project } from "../../../domain/project";
import { paginatePanels } from "../../../domain/pagination";
import { PanelCanvas } from "../panels/PanelCanvas";

export function ComicPreview({ project, imageUrl }: {
  project: Project;
  imageUrl: (panelId: string, imageId: string) => string;
}) {
  const pages = paginatePanels(project.panels);
  return (
    <section aria-labelledby="premiere-title">
      <h2 id="premiere-title">{project.title}</h2>
      <p>By {project.localAuthorCredit || "A new comic author"}</p>
      {pages.map((page, pageIndex) => (
        <article className="comic-page" aria-label={`Comic page ${pageIndex + 1}`} key={pageIndex}>
          {page.map((panel) => (
            <PanelCanvas
              key={panel.id}
              panel={panel}
              imageUrl={panel.approvedImageVersionId ? imageUrl(panel.id, panel.approvedImageVersionId) : undefined}
              onOverlayChange={() => undefined}
            />
          ))}
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Implement PDF rendering with the same normalized overlay geometry**

```ts
// src/server/export/pdf-layout.ts
import type { Project } from "../../domain/project";
import { paginatePanels } from "../../domain/pagination";

export const PDF_PAGE = { width: 612, height: 792, margin: 36, header: 62, gutter: 12 } as const;

export interface PdfOverlayLayout {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfPanelLayout {
  panelId: string;
  approvedImageVersionId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  overlays: PdfOverlayLayout[];
}

export interface PdfPageLayout {
  title: string;
  byline: string;
  panels: PdfPanelLayout[];
}

export function buildPdfLayout(project: Project): PdfPageLayout[] {
  const panelWidth = (PDF_PAGE.width - PDF_PAGE.margin * 2 - PDF_PAGE.gutter) / 2;
  const panelHeight = (
    PDF_PAGE.height - PDF_PAGE.margin * 2 - PDF_PAGE.header - PDF_PAGE.gutter
  ) / 2;
  return paginatePanels(project.panels).map((panels, pageIndex) => ({
    title: project.title,
    byline: `By ${project.localAuthorCredit || "A new comic author"} · Page ${pageIndex + 1}`,
    panels: panels.map((panel, slot) => {
      const column = slot % 2;
      const row = Math.floor(slot / 2);
      const x = PDF_PAGE.margin + column * (panelWidth + PDF_PAGE.gutter);
      const y = PDF_PAGE.height - PDF_PAGE.margin - PDF_PAGE.header
        - (row + 1) * panelHeight - row * PDF_PAGE.gutter;
      return {
        panelId: panel.id,
        ...(panel.approvedImageVersionId
          ? { approvedImageVersionId: panel.approvedImageVersionId }
          : {}),
        x,
        y,
        width: panelWidth,
        height: panelHeight,
        overlays: panel.overlays.map((overlay) => ({
          text: overlay.text,
          x: x + overlay.x * panelWidth,
          y: y + panelHeight - (overlay.y + overlay.height) * panelHeight,
          width: overlay.width * panelWidth,
          height: overlay.height * panelHeight,
        })),
      };
    }),
  }));
}
```

```ts
// src/server/export/pdf-renderer.ts
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { Project } from "../../domain/project";
import { buildPdfLayout, PDF_PAGE } from "./pdf-layout";

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line || text === "") lines.push(line);
  return lines;
}

export async function renderComicPdf(
  project: Project,
  resolveImage: (projectId: string, imageId: string) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const layout of buildPdfLayout(project)) {
    const page = pdf.addPage([PDF_PAGE.width, PDF_PAGE.height]);
    page.drawText(layout.title, {
      x: PDF_PAGE.margin,
      y: PDF_PAGE.height - PDF_PAGE.margin,
      font: bold,
      size: 20,
      color: rgb(.12, .12, .12),
    });
    page.drawText(layout.byline, {
      x: PDF_PAGE.margin,
      y: PDF_PAGE.height - PDF_PAGE.margin - 22,
      font,
      size: 10,
    });

    for (const panel of layout.panels) {
      page.drawRectangle({
        x: panel.x,
        y: panel.y,
        width: panel.width,
        height: panel.height,
        borderWidth: 2,
        borderColor: rgb(.12, .12, .12),
      });
      if (panel.approvedImageVersionId) {
        const image = await pdf.embedPng(
          await resolveImage(project.id, panel.approvedImageVersionId),
        );
        page.drawImage(image, {
          x: panel.x + 2,
          y: panel.y + 2,
          width: panel.width - 4,
          height: panel.height - 4,
        });
      }
      for (const overlay of panel.overlays) {
        page.drawRectangle({
          x: overlay.x,
          y: overlay.y,
          width: overlay.width,
          height: overlay.height,
          color: rgb(1, 1, 1),
          borderWidth: 1.5,
          borderColor: rgb(.12, .12, .12),
          opacity: .94,
        });
        wrapText(overlay.text, font, 9, overlay.width - 10).forEach((line, index) => {
          page.drawText(line, {
            x: overlay.x + 5,
            y: overlay.y + overlay.height - 14 - index * 11,
            font,
            size: 9,
          });
        });
      }
    }
  }
  return pdf.save();
}
```

If PDF-Lib’s standard font cannot encode a child-entered character, return a visible export error instead of changing the text. The implementation may add one tracked OFL-licensed Unicode font only after recording its license under `THIRD_PARTY_NOTICES.md`.

- [ ] **Step 5: Add the download route and client action**

```ts
function safeFilename(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "comic";
}

router.get("/projects/:id/export.pdf", async (request, response) => {
  const project = await store.load(request.params.id);
  const bytes = await renderComicPdf(project, async (projectId, imageId) => fs.readFile(store.assetPath(projectId, imageId)));
  response
    .status(200)
    .set({
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${safeFilename(project.title)}.pdf"`,
      "cache-control": "no-store",
    })
    .send(Buffer.from(bytes));
});
```

The Premiere button uses a normal download link to `/api/projects/:id/export.pdf`; it does not open a print dialog or upload the comic.

- [ ] **Step 6: Verify preview and PDF behavior**

Run: `npm test -- tests/client/comic-preview.test.tsx tests/server/pdf-renderer.test.ts tests/server/export-routes.test.ts`

Expected: two-page pagination PASS, exact dialogue command preservation PASS, PDF signature PASS, and a missing approved image returns a recoverable export error.

- [ ] **Step 7: Commit premiere and export**

```bash
git add src/client/features/comic src/client/App.tsx src/client/api/client.ts src/server/export src/server/routes/export-routes.ts src/server/app.ts tests/client/comic-preview.test.tsx tests/server/pdf-renderer.test.ts tests/server/export-routes.test.ts
git commit -m "feat: add comic premiere and PDF export"
```

### Task 8: Close the complete journey, documentation, and judging proof

**Files:**
- Create: `tests/integration/comic-journey.test.ts`
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `README.md`
- Modify: `docs/STATE.md`
- Modify: `docs/PLAN.md`
- Modify: `docs/DECISIONS.md` only if execution discovers and accepts a consequential change
- Modify: client/server files only for defects exposed by verification

**Interfaces:**
- Consumes: all prior core components
- Produces: deterministic mocked full-journey proof
- Produces: clean-clone setup and judge instructions
- Produces: separated automated, live-provider, and manual validation evidence

- [ ] **Step 1: Write the mocked complete-journey test**

```ts
// tests/integration/comic-journey.test.ts
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createProject } from "../../src/domain/project";
import { paginatePanels } from "../../src/domain/pagination";
import { renderComicPdf } from "../../src/server/export/pdf-renderer";
import type {
  GenerationProvider,
  RenderingChoices,
  VisualInput,
} from "../../src/server/generation/contracts";
import { GenerationService } from "../../src/server/generation/generation-service";
import { ProjectStore } from "../../src/server/storage/project-store";

class RecordingProvider implements GenerationProvider {
  readonly calls: string[] = [];
  constructor(private readonly png: Buffer) {}
  async moderate(text: string) { this.calls.push(text); }
  async chooseRendering(input: VisualInput): Promise<RenderingChoices> {
    this.calls.push(JSON.stringify(input));
    return {
      shotSize: "wide",
      cameraAngle: "eye_level",
      lighting: "moonlit",
      palette: "cool",
      focus: "action",
    };
  }
  async generateHero(prompt: string) {
    this.calls.push(prompt);
    return { bytes: this.png, providerRequestId: "hero-request", durationMs: 1 };
  }
  async generatePanel(_referencePath: string, prompt: string) {
    this.calls.push(prompt);
    return { bytes: this.png, providerRequestId: "panel-request", durationMs: 1 };
  }
}

it("authors, illustrates, revises, restores, and exports a four-panel project", async () => {
  const png = await fs.readFile("sample-assets/moon-kite/images/panel-1.png");
  const store = new ProjectStore(path.resolve("tmp", `journey-${randomUUID()}`));
  const provider = new RecordingProvider(png);
  const service = new GenerationService(store, provider);
  const project = createProject({ title: "Nova and the Moon Kite", localAuthorCredit: "M." });
  project.hero.childDescription = "Nova wears a violet flight jacket and round goggles.";
  project.beats[0]!.childText = "Nova tests her moon kite.";
  project.panels[0]!.action = "Nova launches the moon kite.";
  project.panels[0]!.setting = "A rooftop at night.";
  project.panels[0]!.overlays = [{
    id: "dialogue-1",
    kind: "dialogue",
    text: "Tonight, I’ll touch the moon!",
    speaker: "Nova",
    x: 0.06,
    y: 0.06,
    width: 0.48,
    height: 0.22,
  }];
  await store.save(project);

  const hero = await service.generateHero(project.id);
  const heroCandidate = hero.imageVersions.at(-1)!;
  await service.approveHero(project.id, heroCandidate.id);
  await service.generatePanel(project.id, project.panels[0]!.id, "");
  const firstCandidate = (await store.load(project.id)).panels[0]!.imageVersions.at(-1)!;
  await service.generatePanel(project.id, project.panels[0]!.id, "Make it moonlit");
  const newestCandidate = (await store.load(project.id)).panels[0]!.imageVersions.at(-1)!;
  expect(newestCandidate.id).not.toBe(firstCandidate.id);
  await service.approvePanelVersion(project.id, project.panels[0]!.id, newestCandidate.id);

  const restored = await store.load(project.id);
  expect(restored.panels[0]!.overlays[0]!.text).toBe("Tonight, I’ll touch the moon!");
  expect(restored.panels[0]!.imageVersions).toHaveLength(2);
  expect(paginatePanels(restored.panels)).toHaveLength(1);
  const pdf = await renderComicPdf(restored, async () => png);
  expect(Buffer.from(pdf).subarray(0, 5).toString()).toBe("%PDF-");
  expect(provider.calls.join("\n")).not.toContain("Tonight, I’ll touch the moon!");
  expect(provider.calls.join("\n")).not.toContain("M.");
});
```

Client tests in Tasks 5–7 cover the real React controls; this integration test crosses the real schema, filesystem store, generation service, approval transitions, reload, pagination, and PDF renderer with only the paid provider replaced.

- [ ] **Step 2: Run the full deterministic suite**

Run: `npm run verify`

Expected:

- strict typecheck PASS;
- all domain, server, client, and integration tests PASS;
- production client build PASS.

- [ ] **Step 3: Run and inspect the local application**

Run: `npm run dev`

Expected:

- API available at `http://127.0.0.1:4173/api/health`;
- UI available at `http://127.0.0.1:5173`;
- no browser console errors;
- missing-key startup enters sample mode;
- sample editing creates a writable project and leaves tracked fixtures unchanged.

Use the in-app browser for manual visual QA at:

- 1440×900 desktop;
- 1024×768 tablet landscape; and
- 390×844 narrow viewport.

Capture proof separately from automated test output.

- [ ] **Step 4: Run the live-provider acceptance pass**

Run: `npm run smoke:openai`

Then complete one four-panel project through the UI with the local key configured.

Record separately:

- compiler model and image model;
- hero and panel latency;
- continuity observations;
- one redirection where the old approved image remains visible;
- provider or safety errors encountered; and
- total paid image requests.

Do not describe this as deterministic test proof.

- [ ] **Step 5: Perform the manual accessibility and failure checklist**

Verify:

- every control is keyboard reachable;
- focus is always visible;
- fields have labels;
- body text remains readable at 200% zoom;
- no required action depends only on color;
- reduced-motion preference removes decorative motion;
- auth, quota, rate-limit, timeout, safety, and export errors preserve the project;
- child-facing errors contain no raw provider response;
- no API key appears in browser source, network JSON, project JSON, logs, or PDF;
- exact dialogue remains unchanged after save, reload, regeneration, and export.

- [ ] **Step 6: Replace the current README with complete judge instructions**

README sections, in order:

1. `Comic Creator`
2. `What problem it solves`
3. `The authorship rule`
4. `What works`
5. `Architecture`
6. `Requirements`
7. `Run locally`
8. `Sample mode`
9. `Run tests`
10. `OpenAI model roles`
11. `How Codex accelerated the build`
12. `Human decisions`
13. `Privacy and safety boundary`
14. `Known limitations`
15. `Build Week judging`

The setup commands are:

```bash
npm install
npm run dev
```

The README may name `OPENAI_API_KEY` and the secure OpenAI Platform flow, but must not contain a secret, example secret, or instructions to paste a key into chat.

State clearly:

- no hosted website is required for this submission;
- sample mode incurs no API use;
- live generation uses the runner’s own API project;
- the project is founder-supervised and not a child-privacy compliance claim;
- character consistency is best effort; and
- literacy, retention, and willingness-to-pay outcomes remain unproven.

- [ ] **Step 7: Add third-party notices**

Document direct runtime dependencies and their licenses. Include any tracked font or non-code asset license. State that the “Nova and the Moon Kite” sample artwork is original project material generated by `scripts/build-sample-assets.ts`.

- [ ] **Step 8: Rehearse a clean setup without disturbing the working checkout**

Use a temporary directory created for verification. Copy the tracked repository contents without `.git`, `.env.local`, `data`, `tmp`, `node_modules`, or `.superpowers`, then run:

```bash
npm ci
npm run verify
```

Use Trash to remove the temporary verification directory after evidence is captured.

Expected: install and verification PASS using only tracked files.

- [ ] **Step 9: Update canonical state and plan**

`docs/STATE.md` must distinguish:

- implemented behavior;
- deterministic automated proof;
- live OpenAI proof;
- manual browser/PDF proof;
- remaining submission work; and
- whether the two-author stretch remains unstarted.

`docs/PLAN.md` marks Checkpoint 2 complete only after this implementation plan was approved, and marks Checkpoint 3 complete only after every core acceptance criterion passes.

- [ ] **Step 10: Commit the verified core**

```bash
git add README.md THIRD_PARTY_NOTICES.md tests/integration docs/STATE.md docs/PLAN.md src package.json package-lock.json sample-assets scripts
git commit -m "docs: verify Comic Creator Build Week core"
```

Do not include `.env.local`, `data/`, `tmp/`, `.superpowers/`, or generated local logs.

## Core Completion Gate

Before considering the same-device two-author stretch, confirm all of these:

- clean clone starts from README;
- sample mode works without a key or paid call;
- live hero and panel requests pass the recorded latency/continuity gate;
- four child-authored beats and four panels complete;
- exact overlays survive save, reload, regeneration, and PDF export;
- candidate artwork never replaces approved artwork automatically;
- additional panels derive additional pages;
- automated, live-provider, and manual proof are reported separately; and
- the under-three-minute demo path has been rehearsed.

If any item fails, fix the core before adding stretch scope.
