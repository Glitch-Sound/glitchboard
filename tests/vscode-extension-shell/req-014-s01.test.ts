import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";

describe("REQ-014-S01 不正なポイント", () => {
  it("points:4を拒否してYAMLを変更しない", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-message-"));
    const project = join(root, "project.yaml");
    const manage = join(root, "manage.yaml");
    await writeFile(
      manage,
      "settings: {workdays_off: [], public_holidays: false}\nprojects: [{file: project.yaml, load: true}]\n",
    );
    const source =
      "id: 22222222-2222-4222-8222-222222222222\nname: Alpha\ncolor: '#123456'\nevents: []\n";
    await writeFile(project, source);
    const session = new BoardSession(manage);
    await session.reload();
    const result = await session.handleOperation({
      type: "updateTask",
      taskId: "11111111-1111-4111-8111-111111111111",
      points: 4,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/points|ポイント/);
    expect(await readFile(project, "utf8")).toBe(source);
  });
});
