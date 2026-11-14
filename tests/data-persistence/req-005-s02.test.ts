import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renameProject } from "../../packages/extension/src/storage/project.js";

describe("REQ-005-S02 名称変更", () => {
  it("Project名を変えてもファイル名と参照を維持する", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-"));
    await mkdir(join(root, "projects"));
    const path = join(root, "projects/0001_alpha.yaml");
    await writeFile(
      path,
      `id: 6d947a2f-36c7-4c59-a42e-96c385d4be85\nname: alpha\ncolor: '#336699'\nevents: []\n`,
    );
    const managePath = join(root, "manage.yaml");
    const manage = `settings:\n  workdays_off: [sat, sun]\n  public_holidays: true\nprojects:\n  - file: projects/0001_alpha.yaml\n    load: true\n`;
    await writeFile(managePath, manage);
    await renameProject(path, "beta");
    expect(await readFile(path, "utf8")).toContain("name: beta");
    expect(await readFile(managePath, "utf8")).toBe(manage);
  });
});
