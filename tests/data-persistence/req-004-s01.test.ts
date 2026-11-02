import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadManageFile } from "../../packages/extension/src/storage/manage.js";

describe("REQ-004-S01 無効な日付", () => {
  it("ファイルと項目を示し、元ファイルを変更しない", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-"));
    await mkdir(join(root, "projects"));
    const path = join(root, "projects/0001_alpha.yaml");
    const source = `id: 6d947a2f-36c7-4c59-a42e-96c385d4be85\nname: Alpha\ncolor: '#336699'\nevents:\n  - id: 3169798f-f7ea-4256-a80e-65c732f68533\n    name: Event\n    due: 2026-02-30\n    stories: []\n`;
    await writeFile(path, source);
    const managePath = join(root, "manage.yaml");
    await writeFile(
      managePath,
      `settings:\n  workdays_off: [sat, sun]\n  public_holidays: true\nprojects:\n  - file: projects/0001_alpha.yaml\n    load: true\n`,
    );
    await expect(loadManageFile(managePath)).rejects.toThrow(
      /0001_alpha\.yaml.*due/s,
    );
    expect(await readFile(path, "utf8")).toBe(source);
  });
});
