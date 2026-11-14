import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProject } from "../../packages/extension/src/storage/manage.js";
import { parseProjectYaml } from "../../packages/extension/src/storage/project.js";

describe("REQ-005-S01 名前の安全な変換", () => {
  it("空白と区切り文字を置換しUUIDを採番する", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-"));
    const managePath = join(root, "manage.yaml");
    await writeFile(
      managePath,
      `settings:\n  workdays_off: [sat, sun]\n  public_holidays: true\nprojects: []\n`,
    );
    const file = await createProject(managePath, "A/B 計画", "#336699");
    expect(file).toBe("projects/0001_A-B-計画.yaml");
    expect(
      parseProjectYaml(await readFile(join(root, file), "utf8")).id,
    ).toMatch(/^[0-9a-f-]{36}$/);
  });
});
