import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addEvent } from "../../packages/extension/src/storage/hierarchy.js";

describe("REQ-022-S01 Event追加", () => {
  it("選択中Projectへ名前と期限を保存しUUIDを採番する", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-add-"));
    const path = join(root, "project.yaml");
    await writeFile(
      path,
      "# project comment\nid: 11111111-1111-4111-8111-111111111111\nname: Alpha\ncolor: '#123456'\nevents: []\n",
    );
    const event = await addEvent(path, "Launch", "2026-11-10");
    expect(event.name).toBe("Launch");
    expect(event.due).toBe("2026-11-10");
    expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
    const yaml = await readFile(path, "utf8");
    expect(yaml).toContain("Launch");
    expect(yaml).toContain("# project comment");
  });
});
