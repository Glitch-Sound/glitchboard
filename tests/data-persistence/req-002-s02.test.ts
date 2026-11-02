import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProject } from "../../packages/extension/src/storage/manage.js";

describe("REQ-002-S02 新規Projectファイル", () => {
  it("既存の最大番号に1を加えたファイルを作る", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-"));
    await mkdir(join(root, "projects"));
    const managePath = join(root, "manage.yaml");
    await writeFile(
      managePath,
      `
settings:
  workdays_off: [sat, sun]
  public_holidays: true
projects:
  - file: projects/0001_alpha.yaml
    load: true
  - file: projects/0003_gamma.yaml
    load: false
`,
    );
    const file = await createProject(managePath, "Delta", "#336699");
    expect(file).toBe("projects/0004_Delta.yaml");
    expect(await readFile(join(root, file), "utf8")).toContain("name: Delta");
    expect(await readFile(managePath, "utf8")).toContain(
      "file: projects/0004_Delta.yaml",
    );
  });
});
