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
