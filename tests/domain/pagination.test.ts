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

  it("sorts shuffled panels and keeps a partial final page", () => {
    const panels = [
      { id: "p3", order: 2 },
      { id: "p5", order: 4 },
      { id: "p1", order: 0 },
      { id: "p4", order: 3 },
      { id: "p2", order: 1 },
    ];

    expect(paginatePanels(panels).map((page) => page.map((panel) => panel.id))).toEqual([
      ["p1", "p2", "p3", "p4"],
      ["p5"],
    ]);
  });
});
