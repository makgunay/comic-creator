import { describe, expect, it } from "vitest";
import {
  approveImageVersion,
  hasStaleEmbeddedLettering,
  hasUsableEmbeddedLettering,
} from "../../src/domain/image-versions";
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
    expect(updated.imageVersions.find((version) => version.id === "new")?.status).toBe("approved");
    expect(updated.imageVersions.find((version) => version.id === "old")?.status).toBe("rejected");
  });

  it("does not mutate the input and rejects every unselected active version", () => {
    const panel = makePanel({
      approvedImageVersionId: "old",
      imageVersions: [
        makeImageVersion({ id: "old", status: "approved" }),
        makeImageVersion({ id: "new", status: "candidate" }),
        makeImageVersion({ id: "other", status: "candidate" }),
      ],
    });

    const updated = approveImageVersion(panel, "new");

    expect(panel.approvedImageVersionId).toBe("old");
    expect(panel.imageVersions.map((version) => version.status)).toEqual([
      "approved",
      "candidate",
      "candidate",
    ]);
    expect(updated.imageVersions.find((version) => version.id === "other")?.status).toBe("rejected");
  });

  it("rejects approval of a version that is not a candidate", () => {
    const panel = makePanel({
      imageVersions: [makeImageVersion({ id: "rejected", status: "rejected" })],
    });

    expect(() => approveImageVersion(panel, "rejected")).toThrow(
      "Image version is not a candidate: rejected",
    );
  });

  it("rejects a snapshot-less embedded candidate while accepting an exact snapshot", () => {
    const overlay = {
      id: "dialogue",
      kind: "dialogue" as const,
      text: "Exact words",
      x: .1,
      y: .1,
      width: .4,
      height: .2,
    };
    const missing = makePanel({
      overlays: [overlay],
      imageVersions: [makeImageVersion({
        id: "missing-snapshot",
        localPath: "images/missing-snapshot.png",
        letteringMode: "embedded",
      })],
    });
    expect(() => approveImageVersion(missing, "missing-snapshot"))
      .toThrow("Embedded lettering has no source snapshot: missing-snapshot");

    const matching = makePanel({
      overlays: [overlay],
      imageVersions: [makeImageVersion({
        id: "matching-snapshot",
        localPath: "images/matching-snapshot.png",
        letteringMode: "embedded",
        letteringSnapshot: [overlay],
      })],
    });
    expect(approveImageVersion(matching, "matching-snapshot").approvedImageVersionId)
      .toBe("matching-snapshot");
  });

  it("treats snapshot-less embedded lettering as stale until authoritative hydration", () => {
    const version = makeImageVersion({
      letteringMode: "embedded",
      letteringSnapshot: undefined,
    });

    expect(hasStaleEmbeddedLettering(version, [])).toBe(true);
    expect(hasUsableEmbeddedLettering(version, [])).toBe(false);
  });

  it("rejects a malformed panel with duplicate image version IDs", () => {
    const panel = makePanel({
      imageVersions: [
        makeImageVersion({ id: "duplicate" }),
        makeImageVersion({ id: "duplicate", localPath: "images/duplicate-2.png" }),
      ],
    });

    expect(() => approveImageVersion(panel, "duplicate")).toThrow(
      "Duplicate image version ID: duplicate",
    );
  });
});
