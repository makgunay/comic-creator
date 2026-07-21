import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function appCss(): Promise<string> {
  return fs.readFile(path.resolve("src/client/styles/app.css"), "utf8");
}

function guardedCssRegion(
  css: string,
  startMarker: string | undefined,
  endMarker: string,
): string {
  const start = startMarker === undefined ? 0 : css.indexOf(startMarker);
  const end = css.indexOf(endMarker);
  expect(start, `missing CSS start marker: ${startMarker ?? "start of file"}`)
    .toBeGreaterThanOrEqual(0);
  expect(end, `missing or out-of-order CSS end marker: ${endMarker}`)
    .toBeGreaterThan(start);
  return css.slice(start, end);
}

const desktopCss = (css: string) => guardedCssRegion(css, undefined, "@media");
const mobileCss = (css: string) => guardedCssRegion(
  css,
  "@media (max-width: 760px)",
  "@media (prefers-reduced-motion: reduce)",
);

describe("mobile panel navigation CSS", () => {
  it("shows complete square panel art in the workshop and Premiere", async () => {
    const css = await appCss();
    const desktop = desktopCss(css);
    const mobile = mobileCss(css);
    const workshopFrame = desktop.match(/\.panel-canvas\s*\{([^}]*)\}/)?.[1] ?? "";
    const workshopImage = desktop.match(/\.panel-canvas > img\s*\{([^}]*)\}/)?.[1] ?? "";
    const premiereFrame = desktop.match(/\.comic-panel\s*\{([^}]*)\}/)?.[1] ?? "";
    const premiereImage = desktop.match(/\.comic-panel > img\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(workshopFrame).toMatch(/aspect-ratio:\s*1(?:\s*\/\s*1)?\s*;/);
    expect(workshopImage).toMatch(/object-fit:\s*contain/);
    expect(premiereFrame).toMatch(/aspect-ratio:\s*1(?:\s*\/\s*1)?\s*;/);
    expect(premiereImage).toMatch(/object-fit:\s*contain/);
    expect(mobile).not.toMatch(/\.panel-canvas\s*\{[^}]*aspect-ratio/);
  });

  it("caps the one-line desktop hero heading inside its narrow authoring column", async () => {
    const css = await appCss();
    const desktopRule = desktopCss(css)
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
    const mobile = mobileCss(await appCss());
    const rules = mobile.match(/\.panel-navigation\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(rules).toMatch(/position:\s*static/);
    expect(rules).not.toMatch(/position:\s*sticky/);
    expect(rules).toMatch(
      /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+minmax\(0,\s*1fr\)/,
    );
  });

  it("keeps embedded-lettering tools stacked and touch-sized on mobile", async () => {
    const mobile = mobileCss(await appCss());
    const toolbar = mobile.match(/\.embedded-lettering-tools\s*\{([^}]*)\}/)?.[1] ?? "";
    const button = mobile.match(/\.embedded-lettering-tools button\s*\{([^}]*)\}/)?.[1] ?? "";
    const overlayText = mobile.match(/\.text-overlay textarea\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(toolbar).toMatch(/flex-direction:\s*column/);
    expect(button).toMatch(/min-height:\s*44px/);
    expect(overlayText).toMatch(/font-size:\s*clamp\(\.68rem,\s*3\.2vw,\s*\.84rem\)/);
    expect(overlayText).toMatch(/padding:\s*3px 7px/);
  });
});
