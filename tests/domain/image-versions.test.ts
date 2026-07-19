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
    expect(updated.imageVersions.find((version) => version.id === "new")?.status).toBe("approved");
    expect(updated.imageVersions.find((version) => version.id === "old")?.status).toBe("rejected");
  });

  it("does not mutate the input and leaves other candidates unchanged", () => {
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
    expect(updated.imageVersions.find((version) => version.id === "other")?.status).toBe("candidate");
  });

  it("rejects approval of a version that is not a candidate", () => {
    const panel = makePanel({
      imageVersions: [makeImageVersion({ id: "rejected", status: "rejected" })],
    });

    expect(() => approveImageVersion(panel, "rejected")).toThrow(
      "Image version is not a candidate: rejected",
    );
  });
});
