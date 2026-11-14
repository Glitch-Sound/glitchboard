import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadManageFile } from "../../packages/extension/src/storage/manage.js";

describe("REQ-002-S01 別のワークスペースから開く", () => {
  it("manage.yaml の親から相対Projectパスを解決する", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-"));
    await mkdir(join(root, "projects"));
    await writeFile(
      join(root, "projects/0001_alpha.yaml"),
      `
id: 6d947a2f-36c7-4c59-a42e-96c385d4be85
name: Alpha
color: '#4277cc'
events: []
`,
    );
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
`,
    );
    const result = await loadManageFile(managePath);
    expect(result.loadedProjects.map((project) => project.name)).toEqual([
      "Alpha",
    ]);
    expect(result.manage.projects[0]?.file).toBe("projects/0001_alpha.yaml");
  });
});
