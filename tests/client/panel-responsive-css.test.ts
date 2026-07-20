import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile panel navigation CSS", () => {
  it("caps the one-line desktop hero heading inside its narrow authoring column", async () => {
    const css = await fs.readFile(
      path.resolve("src/client/styles/app.css"),
      "utf8",
    );
    const desktopRule = css
      .slice(0, css.indexOf("@media"))
      .match(/\.hero-form-panel h1\s*\{([^}]*)\}/)?.[1] ?? "";
    const maximumRem = Number(
      desktopRule.match(
        /font-size:\s*clamp\([^,]+,\s*[^,]+,\s*([0-9.]+)rem\)/,
      )?.[1],
    );

    expect(maximumRem).toBeLessThanOrEqual(3);
    expect(desktopRule).toMatch(/white-space:\s*nowrap/);
  });

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
