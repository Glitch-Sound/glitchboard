import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { loadManageFile } from "../../packages/extension/src/storage/manage.js";

it("REQ-038-S01 読込だけでは未使用属性を含むYAMLを書き換えない", async () => {
  const root = await mkdtemp(join(tmpdir(), "glitchboard-readonly-"));
  try {
    const path = join(root, "project.yaml");
    const source =
      "# 注釈\nid: 11111111-1111-4111-8111-111111111111\nname: Alpha\ncolor: '#123456'\nlinks: [https://example.test]\nevents: []\n";
    await writeFile(path, source);
    const manage = join(root, "manage.yaml");
    await writeFile(
      manage,
      "settings: {workdays_off: [], public_holidays: false}\nprojects: [{file: project.yaml, load: true}]\n",
    );
    for (let i = 0; i < 2; i++) {
      const { loadedProjects } = await loadManageFile(manage);
      expect(loadedProjects[0]).not.toHaveProperty("links");
      expect(await readFile(path, "utf8")).toBe(source);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
