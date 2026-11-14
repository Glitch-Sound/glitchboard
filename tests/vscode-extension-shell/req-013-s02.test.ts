import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";

describe("REQ-013-S02 不正な外部変更", () => {
  it("直前の有効な表示を維持しエラーを配信する", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-shell-"));
    const project = join(root, "project.yaml");
    const manage = join(root, "manage.yaml");
    await writeFile(
      manage,
      "settings: {workdays_off: [], public_holidays: false}\nprojects: [{file: project.yaml, load: true}]\n",
    );
    await writeFile(
      project,
      "id: 22222222-2222-4222-8222-222222222222\nname: Alpha\ncolor: '#123456'\nevents: []\n",
    );
    const session = new BoardSession(manage);
    await session.reload();
    const before = session.snapshot();
    await writeFile(project, "events: [");
    await session.reload();
    expect(session.snapshot().projects).toEqual(before.projects);
    expect(session.snapshot().error).toBeTruthy();
    expect(session.snapshot().version).toBeGreaterThan(before.version);
  });
});
