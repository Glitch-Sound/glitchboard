import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";

describe("REQ-020-S02 読込切り替え", () => {
  it("Bを外すと一覧データから消えmanage.yamlのloadがfalseになる", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-filter-"));
    const manage = join(root, "manage.yaml");
    await writeFile(
      manage,
      "settings: {workdays_off: [], public_holidays: false}\nprojects: [{file: A.yaml, load: true}, {file: B.yaml, load: true}]\n",
    );
    const project = (id: string, name: string) =>
      `id: ${id}\nname: ${name}\ncolor: '#123456'\nevents: []\n`;
    await writeFile(
      join(root, "A.yaml"),
      project("11111111-1111-4111-8111-111111111111", "A"),
    );
    await writeFile(
      join(root, "B.yaml"),
      project("22222222-2222-4222-8222-222222222222", "B"),
    );
    const session = new BoardSession(manage);
    await session.reload();
    await session.setProjectLoaded("B.yaml", false);
    expect(session.snapshot().projects.map((item) => item.name)).toEqual(["A"]);
    expect(await readFile(manage, "utf8")).toContain("load: false");
  });
});
