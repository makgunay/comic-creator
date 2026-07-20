import { vi } from "vitest";
import type { Project } from "../../src/domain/project";
import type { ComicApi } from "../../src/client/api/client";

export function makeClientApi(project: Project, overrides: Partial<ComicApi> = {}): ComicApi {
  return {
    config: vi.fn().mockResolvedValue({ generationEnabled: false }),
    createProject: vi.fn().mockResolvedValue(project),
    copySample: vi.fn().mockResolvedValue(project),
    loadProject: vi.fn().mockResolvedValue(project),
    saveProject: vi.fn().mockImplementation(async (next) => next),
    generateHero: vi.fn().mockResolvedValue({ project }),
    approveHero: vi.fn().mockResolvedValue({ project, heroReferenceChanged: false }),
    rejectHeroCandidate: vi.fn().mockResolvedValue({ project }),
    generatePanel: vi.fn().mockResolvedValue({ project }),
    approvePanelVersion: vi.fn().mockResolvedValue({ project }),
    rejectPanelCandidate: vi.fn().mockResolvedValue({ project }),
    imageUrl: vi.fn((projectId, imageId) => `/api/projects/${projectId}/images/${imageId}`),
    ...overrides,
  };
}
