import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";

describe("REQ-003-S02 読込対象外の名前", () => {
  it("Eventを読み込まず、ファイルからProject名だけを表示データへ載せる", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-unloaded-name-"));
    const manage = join(root, "manage.yaml");
    await writeFile(
      manage,
      "settings: {workdays_off: [], public_holidays: false}\nprojects: [{file: B.yaml, load: false}]\n",
    );
    await writeFile(
      join(root, "B.yaml"),
      "name: Beta\nevents: [{name: 未読込}]\n",
    );
    const session = new BoardSession(manage);
    await session.reload();
    expect(session.snapshot().projects).toEqual([]);
    expect(session.snapshot().projectEntries).toEqual([
      { file: "B.yaml", load: false, name: "Beta" },
    ]);
  });
});
