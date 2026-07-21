import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("production runtime dependencies", () => {
  it("installs Sharp for server image validation and reference preparation", async () => {
    const packageJson = JSON.parse(
      await fs.readFile(path.resolve("package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.sharp).toBe("0.35.3");
    expect(packageJson.devDependencies?.sharp).toBeUndefined();
  });

  it("installs the pinned TypeScript runtime for production start", async () => {
    const packageJson = JSON.parse(
      await fs.readFile(path.resolve("package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.tsx).toBe("4.23.1");
    expect(packageJson.devDependencies?.tsx).toBeUndefined();
  });
});
