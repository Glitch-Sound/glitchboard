import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadManageFile,
  setProjectLoaded,
} from "../../packages/extension/src/storage/manage.js";

describe("REQ-003-S01 読込を外す", () => {
  it("loadを保存し、再読込後の集計対象から外す", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-"));
    await mkdir(join(root, "projects"));
    const make = (name: string, id: string) =>
      `id: ${id}\nname: ${name}\ncolor: '#336699'\nevents: []\n`;
    await writeFile(
      join(root, "projects/0001_alpha.yaml"),
      make("Alpha", "6d947a2f-36c7-4c59-a42e-96c385d4be85"),
    );
    await writeFile(
      join(root, "projects/0002_beta.yaml"),
      make("Beta", "3169798f-f7ea-4256-a80e-65c732f68533"),
    );
    const managePath = join(root, "manage.yaml");
    await writeFile(
      managePath,
      `settings:\n  workdays_off: [sat, sun]\n  public_holidays: true\nprojects:\n  - file: projects/0001_alpha.yaml\n    load: true\n  - file: projects/0002_beta.yaml\n    load: true\n`,
    );
    await setProjectLoaded(managePath, "projects/0002_beta.yaml", false);
    expect(
      (await loadManageFile(managePath)).loadedProjects.map((p) => p.name),
    ).toEqual(["Alpha"]);
    expect(await readFile(managePath, "utf8")).toContain("load: false");
  });
});
