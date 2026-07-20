import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile panel navigation CSS", () => {
  it("keeps navigation after content in one non-sticky row", async () => {
    const css = await fs.readFile(
      path.resolve("src/client/styles/app.css"),
      "utf8",
    );
    const mobile = css.slice(
      css.indexOf("@media (max-width: 760px)"),
      css.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    const rules = mobile.match(/\.panel-navigation\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(rules).toMatch(/position:\s*static/);
    expect(rules).not.toMatch(/position:\s*sticky/);
    expect(rules).toMatch(
      /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+minmax\(0,\s*1fr\)/,
    );
  });
});
